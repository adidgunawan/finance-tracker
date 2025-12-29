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

  // Get account type to determine if we should use debit or credit
  const { data: account, error: accountError } = await supabase
    .from("chart_of_accounts")
    .select("type")
    .eq("id", budget.account_id)
    .single();

  if (accountError) throw new Error(accountError.message);

  // Fetch transaction lines with joined transactions to filter by date
  // For expense accounts: use debit_amount (spending increases debits)
  // For income accounts: use credit_amount (income increases credits)
  const { data: lines, error: linesError } = await supabase
    .from("transaction_lines")
    .select(`
      debit_amount,
      credit_amount,
      transaction:transactions!inner(
        transaction_date,
        user_id
      )
    `)
    .eq("account_id", budget.account_id)
    .eq("transaction.user_id", session.user.id)
    .gte("transaction.transaction_date", startDate)
    .lte("transaction.transaction_date", endDate);

  if (linesError) throw new Error(linesError.message);

  // Calculate actual amount based on account type
  let actualAmount = 0;
  if (account.type === "expense") {
    // For expenses, sum debit amounts (spending)
    actualAmount = lines?.reduce((sum, line) => sum + (line.debit_amount || 0), 0) || 0;
  } else if (account.type === "income") {
    // For income, sum credit amounts (earnings)
    actualAmount = lines?.reduce((sum, line) => sum + (line.credit_amount || 0), 0) || 0;
  }

  return {
    budgeted: budgetedAmount,
    actual: actualAmount,
    remaining: budgetedAmount - actualAmount,
    percentage: budgetedAmount > 0 ? (actualAmount / budgetedAmount) * 100 : 0
  };
}
