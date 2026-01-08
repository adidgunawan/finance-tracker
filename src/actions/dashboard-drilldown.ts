"use server";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "./base";
import { startOfMonth, endOfMonth } from "date-fns";
import type { Database } from "@/lib/supabase/types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export interface DrillDownTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  accountName: string;
}

export interface DrillDownSubtotal {
  accountId: string;
  accountName: string;
  amount: number;
  currency: string;
  percentage: number;
  hasChildren: boolean;
}

export const getTransactionsByCategory = async (categoryName: string): Promise<DrillDownTransaction[]> => {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const userId = session.user.id;

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  // First, find the account by name (could be level 1 or any level)
  const { data: accountData, error: accountError } = await supabase
    .from("chart_of_accounts")
    .select("id, name, level, parent_id, type")
    .eq("user_id", userId)
    .eq("name", categoryName)
    .eq("type", "expense")
    .maybeSingle();

  if (accountError) {
    console.error("Error fetching account:", accountError);
    throw new Error(accountError.message);
  }

  if (!accountData) {
    // No account found with this name
    return [];
  }

  // Now find all child accounts recursively
  const accountIds = [accountData.id];
  
  // Function to recursively find all children
  const findChildren = async (parentId: string) => {
    const { data: children } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("parent_id", parentId);
    
    if (children && children.length > 0) {
      for (const child of children) {
        accountIds.push(child.id);
        await findChildren(child.id); // Recursively find grandchildren
      }
    }
  };

  // Find all descendants
  await findChildren(accountData.id);

  // Now query transactions for all these accounts
  const { data, error } = await supabase
    .from("transaction_lines")
    .select(`
      debit_amount,
      credit_amount,
      transaction:transactions!inner (
        id,
        transaction_date,
        description,
        currency
      ),
      account:chart_of_accounts!inner (
        name,
        type
      )
    `)
    .in("account_id", accountIds)
    .gte("transaction.transaction_date", currentMonthStart.toISOString().split("T")[0])
    .lte("transaction.transaction_date", currentMonthEnd.toISOString().split("T")[0]);

  if (error) {
    console.error("Error fetching drilldown transactions:", error);
    throw new Error(error.message);
  }

  // Transform to simple list and sort by date descending
  return (data || [])
    .map((line: any) => ({
      id: line.transaction.id,
      date: line.transaction.transaction_date,
      description: line.transaction.description,
      // For expense accounts, debit is the increase (the expense amount)
      amount: line.debit_amount || 0,
      currency: line.transaction.currency || "USD", // Fallback
      accountName: line.account.name
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getTransactionsByAccountId = async (accountId: string): Promise<DrillDownTransaction[]> => {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const userId = session.user.id;

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  // Get all descendant account IDs (including the account itself)
  const accountIds = [accountId];
  
  const findChildren = async (parentId: string) => {
    const { data: children } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("parent_id", parentId);
    
    if (children && children.length > 0) {
      for (const child of children) {
        accountIds.push(child.id);
        await findChildren(child.id);
      }
    }
  };

  await findChildren(accountId);

  // Query transactions for all these accounts
  const { data, error } = await supabase
    .from("transaction_lines")
    .select(`
      debit_amount,
      credit_amount,
      transaction:transactions!inner (
        id,
        transaction_date,
        description,
        currency
      ),
      account:chart_of_accounts!inner (
        name,
        type
      )
    `)
    .in("account_id", accountIds)
    .gte("transaction.transaction_date", currentMonthStart.toISOString().split("T")[0])
    .lte("transaction.transaction_date", currentMonthEnd.toISOString().split("T")[0]);

  if (error) {
    console.error("Error fetching drilldown transactions:", error);
    throw new Error(error.message);
  }

  // Transform to simple list and sort by date descending
  return (data || [])
    .map((line: any) => ({
      id: line.transaction.id,
      date: line.transaction.transaction_date,
      description: line.transaction.description,
      amount: line.debit_amount || 0,
      currency: line.transaction.currency || "USD",
      accountName: line.account.name
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};


export const getChildAccountSubtotals = async (categoryName: string): Promise<DrillDownSubtotal[]> => {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const userId = session.user.id;

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  // First, find the parent account by name
  const { data: parentAccount, error: accountError } = await supabase
    .from("chart_of_accounts")
    .select("id, name, level, type")
    .eq("user_id", userId)
    .eq("name", categoryName)
    .eq("type", "expense")
    .maybeSingle();

  if (accountError) {
    console.error("Error fetching parent account:", accountError);
    throw new Error(accountError.message);
  }

  if (!parentAccount) {
    return [];
  }

  // Get direct children of this account
  const { data: childAccounts, error: childError } = await supabase
    .from("chart_of_accounts")
    .select("id, name")
    .eq("user_id", userId)
    .eq("parent_id", parentAccount.id)
    .eq("is_active", true);

  if (childError) {
    console.error("Error fetching child accounts:", childError);
    throw new Error(childError.message);
  }

  if (!childAccounts || childAccounts.length === 0) {
    return [];
  }

  // For each child, calculate the total amount (including its descendants)
  const subtotals: DrillDownSubtotal[] = [];
  let totalAmount = 0;

  for (const child of childAccounts) {
    // Get all descendant account IDs (including the child itself)
    const accountIds = [child.id];
    
    const findChildren = async (parentId: string) => {
      const { data: descendants } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("user_id", userId)
        .eq("parent_id", parentId);
      
      if (descendants && descendants.length > 0) {
        for (const desc of descendants) {
          accountIds.push(desc.id);
          await findChildren(desc.id);
        }
      }
    };

    await findChildren(child.id);

    // Check if this child has children
    const { data: hasChildrenData } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("parent_id", child.id)
      .limit(1);

    const hasChildren = (hasChildrenData && hasChildrenData.length > 0) || false;

    // Query transaction lines for all these accounts
    const { data: lines, error: linesError } = await supabase
      .from("transaction_lines")
      .select(`
        debit_amount,
        transaction:transactions!inner (
          transaction_date,
          currency
        )
      `)
      .in("account_id", accountIds)
      .gte("transaction.transaction_date", currentMonthStart.toISOString().split("T")[0])
      .lte("transaction.transaction_date", currentMonthEnd.toISOString().split("T")[0]);

    if (linesError) {
      console.error("Error fetching transaction lines:", linesError);
      continue;
    }

    // Sum up the debit amounts (expenses)
    const amount = (lines || []).reduce((sum: number, line: any) => {
      return sum + (line.debit_amount || 0);
    }, 0);

    // Get currency from first transaction or default to USD
    const currency = lines && lines.length > 0 && lines[0].transaction 
      ? lines[0].transaction.currency || "USD" 
      : "USD";

    if (amount > 0) {
      subtotals.push({
        accountId: child.id,
        accountName: child.name,
        amount,
        currency,
        percentage: 0, // Will calculate after we have total
        hasChildren,
      });
      totalAmount += amount;
    }
  }

  // Calculate percentages
  subtotals.forEach(subtotal => {
    subtotal.percentage = totalAmount > 0 ? (subtotal.amount / totalAmount) * 100 : 0;
  });

  // Sort by amount descending
  return subtotals.sort((a, b) => b.amount - a.amount);
};

