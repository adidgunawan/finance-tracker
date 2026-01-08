"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

// Get all budgets for the user
export async function getBudgets() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("budgets")
    .select(`
      *,
      account:chart_of_accounts(id, name),
      monthly_amounts:budget_monthly_amounts(*)
    `)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

// Create a new budget
export async function createBudget(
  accountId: string,
  budgetType: "fixed_monthly" | "custom_monthly" | "date_range",
  fixedAmount: number | null,
  startDate: string | null,
  endDate: string | null,
  monthlyAmounts: { month: number; year: number; amount: number }[] = []
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // 1. Create the budget record
  const { data: budget, error: budgetError } = await supabase
    .from("budgets")
    .insert({
      user_id: session.user.id,
      account_id: accountId,
      budget_type: budgetType,
      fixed_amount: fixedAmount,
      start_date: startDate,
      end_date: endDate,
      is_active: true,
    })
    .select()
    .single();

  if (budgetError) throw new Error(budgetError.message);

  // 2. Insert monthly amounts if custom budget
  if (budgetType === "custom_monthly" && monthlyAmounts.length > 0) {
    const { error: monthlyError } = await supabase
      .from("budget_monthly_amounts")
      .insert(
        monthlyAmounts.map((m) => ({
          budget_id: budget.id,
          month: m.month,
          year: m.year,
          amount: m.amount,
        }))
      );

    if (monthlyError) {
      // Cleanup budget if monthly amounts fail
      await supabase.from("budgets").delete().eq("id", budget.id);
      throw new Error(monthlyError.message);
    }
  }

  revalidatePath("/budgets");
  return budget;
}

// Update a budget
export async function updateBudget(
  id: string,
  updates: {
    accountId?: string;
    budgetType?: "fixed_monthly" | "custom_monthly" | "date_range";
    fixedAmount?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    isActive?: boolean;
    monthlyAmounts?: { month: number; year: number; amount: number }[];
  }
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // Build update object
  const updateData: any = {};
  if (updates.accountId !== undefined) updateData.account_id = updates.accountId;
  if (updates.budgetType !== undefined) updateData.budget_type = updates.budgetType;
  if (updates.fixedAmount !== undefined) updateData.fixed_amount = updates.fixedAmount;
  if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
  if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
  updateData.updated_at = new Date().toISOString();

  // Update budget
  const { data: budget, error: budgetError } = await supabase
    .from("budgets")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select()
    .single();

  if (budgetError) throw new Error(budgetError.message);

  // Update monthly amounts if provided
  if (updates.monthlyAmounts && updates.budgetType === "custom_monthly") {
    // Delete existing monthly amounts
    await supabase
      .from("budget_monthly_amounts")
      .delete()
      .eq("budget_id", id);

    // Insert new monthly amounts
    if (updates.monthlyAmounts.length > 0) {
      const { error: monthlyError } = await supabase
        .from("budget_monthly_amounts")
        .insert(
          updates.monthlyAmounts.map((m) => ({
            budget_id: id,
            month: m.month,
            year: m.year,
            amount: m.amount,
          }))
        );

      if (monthlyError) throw new Error(monthlyError.message);
    }
  }

  revalidatePath("/budgets");
  return budget;
}

// Toggle budget active status
export async function toggleBudgetStatus(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // Get current status
  const { data: budget, error: fetchError } = await supabase
    .from("budgets")
    .select("is_active")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  // Toggle status
  const { data: updated, error: updateError } = await supabase
    .from("budgets")
    .update({ is_active: !budget.is_active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);

  revalidatePath("/budgets");
  return updated;
}

// Delete a budget
export async function deleteBudget(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // Cascade delete logic should handle monthly_amounts if configured DB side, 
  // but let's delete explicitly if needed.
  // Assuming ON DELETE CASCADE on foreign keys in DB schema.
  
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/budgets");
}

/*
  For Budget vs Actual calculation:
  We need to sum transactions for the account within the budget period.
  This is complex. 
  
  Strategy:
  1. Fetch all transactions for the account.
  2. Filter by date range (current month for fixed/custom, or custom range).
  3. Sum amounts.
*/
export async function getBudgetProgress(budgetId: string, month: number, year: number) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // 1. Get budget details
  const { data: budget, error: budgetError } = await supabase
    .from("budgets")
    .select(`*, monthly_amounts:budget_monthly_amounts(*)`)
    .eq("id", budgetId)
    .single();

  if (budgetError) throw new Error(budgetError.message);

  // 2. Determine budgeted amount for this period
  let budgetedAmount = 0;
  if (budget.budget_type === "fixed_monthly") {
    budgetedAmount = budget.fixed_amount || 0;
  } else if (budget.budget_type === "custom_monthly") {
    // Find amount for specific month/year
    const monthlyEntry = budget.monthly_amounts.find(
      (m: any) => m.month === month && m.year === year
    );
    budgetedAmount = monthlyEntry ? monthlyEntry.amount : 0;
  }

  // 3. Calculate actual spending
  // Define start/end dates for the month
  const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month, 0).toISOString().split("T")[0]; // Last day of month

  // Get account details including level
  const { data: account, error: accountError } = await supabase
    .from("chart_of_accounts")
    .select("id, type, level")
    .eq("id", budget.account_id)
    .single();

  if (accountError) throw new Error(accountError.message);

  // ⭐ Fetch ALL accounts to build hierarchy (same as dashboard)
  const { data: allAccounts, error: allAccountsError } = await supabase
    .from("chart_of_accounts")
    .select("id, name, level, parent_id, type")
    .eq("user_id", session.user.id);

  if (allAccountsError) throw new Error(allAccountsError.message);

  // Build account map for hierarchy traversal
  const accountMap = new Map(allAccounts.map(a => [a.id, a]));

  // ⭐ Find level 1 parent (same logic as dashboard)
  const findLevel1Parent = (accountId: string): { id: string; name: string } | null => {
    let current = accountMap.get(accountId);
    if (!current) return null;
    
    while (current && current.level > 1 && current.parent_id) {
      const parent = accountMap.get(current.parent_id);
      if (!parent) break;
      current = parent;
    }
    
    return current?.level === 1 ? { id: current.id, name: current.name } : null;
  };

  // Fetch transaction lines for the period
  const { data: allLines, error: linesError } = await supabase
    .from("transaction_lines")
    .select(`
      debit_amount,
      credit_amount,
      account:chart_of_accounts!inner(id, name, type, level, parent_id),
      transaction:transactions!inner(
        transaction_date,
        user_id
      )
    `)
    .eq("transaction.user_id", session.user.id)
    .gte("transaction.transaction_date", startDate)
    .lte("transaction.transaction_date", endDate)
    .eq("account.type", account.type); // Only same type (expense or income)

  if (linesError) throw new Error(linesError.message);

  // ⭐ Filter lines that belong to this account or its children
  const relevantLines = allLines.filter(line => {
    if (!line.account) return false;
    const acc = line.account as any;
    
    // Direct match
    if (acc.id === budget.account_id) return true;
    
    // Check if this line's account has the budget account as level 1 parent
    const level1Parent = findLevel1Parent(acc.id);
    return level1Parent?.id === budget.account_id;
  });

  // Calculate actual amount based on account type
  let actualAmount = 0;
  if (account.type === "expense") {
    // For expenses, sum debit amounts (spending)
    actualAmount = relevantLines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
  } else if (account.type === "income") {
    // For income, sum credit amounts (earnings)
    actualAmount = relevantLines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
  }

  return {
    budgeted: budgetedAmount,
    actual: actualAmount,
    remaining: budgetedAmount - actualAmount,
    percentage: budgetedAmount > 0 ? (actualAmount / budgetedAmount) * 100 : 0
  };
}
