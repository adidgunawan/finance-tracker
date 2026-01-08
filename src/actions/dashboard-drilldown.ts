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
