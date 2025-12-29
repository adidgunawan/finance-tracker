"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  accountIds?: string[];
  tagIds?: string[];
  transactionTypes?: ("income" | "expense" | "transfer")[];
}

export interface TransactionReportItem {
  id: string;
  transaction_date: string;
  type: string;
  description: string;
  amount: number;
  payee_payer: string | null;
  account_name: string;
}

export interface AccountHierarchyItem {
  account_id: string;
  account_name: string;
  account_type: string;
  level: number;
  parent_id: string | null;
  total_debits: number;
  total_credits: number;
  balance: number;
  children?: AccountHierarchyItem[];
}

export interface TimeBasedReportItem {
  period: string;
  income: number;
  expense: number;
  net: number;
}

/**
 * Get transactions report with filters
 */
export async function getTransactionsReport(filters: ReportFilters = {}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  let query = supabase
    .from("transactions")
    .select(`
      id,
      transaction_date,
      type,
      description,
      amount,
      payee_payer,
      transaction_lines!inner(
        account_id,
        account:chart_of_accounts!inner(name)
      )
    `)
    .eq("user_id", session.user.id)
    .order("transaction_date", { ascending: false });

  // Apply filters
  if (filters.startDate) {
    query = query.gte("transaction_date", filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte("transaction_date", filters.endDate);
  }
  if (filters.transactionTypes && filters.transactionTypes.length > 0) {
    query = query.in("type", filters.transactionTypes);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  // Transform data and apply account/tag filters
  const transactions = (data || []).map((t: any) => {
    const accountLine = t.transaction_lines?.[0];
    return {
      id: t.id,
      transaction_date: t.transaction_date,
      type: t.type,
      description: t.description,
      amount: t.amount,
      payee_payer: t.payee_payer,
      account_name: accountLine?.account?.name || "Unknown",
    };
  });

  // Filter by account IDs if provided
  let filtered = transactions;
  if (filters.accountIds && filters.accountIds.length > 0) {
    // Need to check transaction_lines for account matching
    const { data: linesData } = await supabase
      .from("transaction_lines")
      .select("transaction_id, account_id")
      .in("account_id", filters.accountIds);

    const transactionIds = new Set(
      linesData?.map((l) => l.transaction_id) || []
    );
    filtered = transactions.filter((t) => transactionIds.has(t.id));
  }

  // Filter by tag IDs if provided
  if (filters.tagIds && filters.tagIds.length > 0) {
    const { data: tagRelations } = await supabase
      .from("transaction_tag_relations")
      .select("transaction_id")
      .in("tag_id", filters.tagIds);

    const taggedTransactionIds = new Set(
      tagRelations?.map((r) => r.transaction_id) || []
    );
    filtered = filtered.filter((t) => taggedTransactionIds.has(t.id));
  }

  return filtered as TransactionReportItem[];
}

/**
 * Get account hierarchy report with transaction totals
 */
export async function getAccountHierarchyReport(
  filters: ReportFilters = {}
): Promise<AccountHierarchyItem[]> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // Get all accounts
  const { data: accounts, error: accountsError } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("user_id", session.user.id)
    .order("level")
    .order("name");

  if (accountsError) throw new Error(accountsError.message);

  // Get transaction lines with date filter
  let linesQuery = supabase
    .from("transaction_lines")
    .select(`
      account_id,
      debit_amount,
      credit_amount,
      transaction:transactions!inner(transaction_date, user_id)
    `)
    .eq("transaction.user_id", session.user.id);

  if (filters.startDate) {
    linesQuery = linesQuery.gte("transaction.transaction_date", filters.startDate);
  }
  if (filters.endDate) {
    linesQuery = linesQuery.lte("transaction.transaction_date", filters.endDate);
  }

  const { data: lines, error: linesError } = await linesQuery;

  if (linesError) throw new Error(linesError.message);

  // Calculate totals per account
  const accountTotals = new Map<
    string,
    { debits: number; credits: number }
  >();

  (lines || []).forEach((line: any) => {
    const accountId = line.account_id;
    if (!accountTotals.has(accountId)) {
      accountTotals.set(accountId, { debits: 0, credits: 0 });
    }
    const totals = accountTotals.get(accountId)!;
    totals.debits += line.debit_amount || 0;
    totals.credits += line.credit_amount || 0;
  });

  // Build hierarchy
  const accountMap = new Map<string, AccountHierarchyItem>();
  const rootAccounts: AccountHierarchyItem[] = [];

  // Create account items
  (accounts || []).forEach((account) => {
    const totals = accountTotals.get(account.id) || { debits: 0, credits: 0 };
    
    // Calculate balance based on account type
    let balance = 0;
    if (account.type === "asset" || account.type === "expense") {
      balance = totals.debits - totals.credits;
    } else {
      balance = totals.credits - totals.debits;
    }

    const item: AccountHierarchyItem = {
      account_id: account.id,
      account_name: account.name,
      account_type: account.type,
      level: account.level,
      parent_id: account.parent_id,
      total_debits: totals.debits,
      total_credits: totals.credits,
      balance,
      children: [],
    };

    accountMap.set(account.id, item);
  });

  // Build tree structure
  accountMap.forEach((item) => {
    if (item.parent_id) {
      const parent = accountMap.get(item.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(item);
      } else {
        rootAccounts.push(item);
      }
    } else {
      rootAccounts.push(item);
    }
  });

  // Calculate parent totals by summing children
  const calculateParentTotals = (item: AccountHierarchyItem): { debits: number; credits: number; balance: number } => {
    let childDebits = item.total_debits;
    let childCredits = item.total_credits;
    let childBalance = item.balance;

    if (item.children && item.children.length > 0) {
      item.children.forEach((child) => {
        const childTotals = calculateParentTotals(child);
        childDebits += childTotals.debits;
        childCredits += childTotals.credits;
        childBalance += childTotals.balance;
      });
    }

    // Update item with totals including children
    item.total_debits = childDebits;
    item.total_credits = childCredits;
    item.balance = childBalance;

    return { debits: childDebits, credits: childCredits, balance: childBalance };
  };

  // Calculate totals for all root accounts and their children
  rootAccounts.forEach((root) => {
    calculateParentTotals(root);
  });

  // Sort children
  const sortAccounts = (items: AccountHierarchyItem[]) => {
    items.sort((a, b) => a.account_name.localeCompare(b.account_name));
    items.forEach((item) => {
      if (item.children) {
        sortAccounts(item.children);
      }
    });
  };

  sortAccounts(rootAccounts);

  return rootAccounts;
}

/**
 * Get time-based report (weekly/monthly/yearly)
 */
export async function getTimeBasedReport(
  period: "week" | "month" | "year",
  filters: ReportFilters = {}
): Promise<TimeBasedReportItem[]> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // Get transactions
  let query = supabase
    .from("transactions")
    .select("transaction_date, type, amount")
    .eq("user_id", session.user.id);

  if (filters.startDate) {
    query = query.gte("transaction_date", filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte("transaction_date", filters.endDate);
  }
  if (filters.transactionTypes && filters.transactionTypes.length > 0) {
    query = query.in("type", filters.transactionTypes);
  }

  const { data: transactions, error } = await query.order("transaction_date");

  if (error) throw new Error(error.message);

  // Group by period
  const periodMap = new Map<string, { income: number; expense: number }>();

  (transactions || []).forEach((t) => {
    const date = new Date(t.transaction_date);
    let periodKey = "";

    if (period === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday
      periodKey = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
    } else if (period === "month") {
      periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    } else if (period === "year") {
      periodKey = String(date.getFullYear());
    }

    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, { income: 0, expense: 0 });
    }

    const totals = periodMap.get(periodKey)!;
    if (t.type === "income") {
      totals.income += t.amount;
    } else if (t.type === "expense") {
      totals.expense += t.amount;
    }
  });

  // Convert to array and format
  const result: TimeBasedReportItem[] = Array.from(periodMap.entries())
    .map(([key, totals]) => ({
      period: formatPeriodKey(key, period),
      income: totals.income,
      expense: totals.expense,
      net: totals.income - totals.expense,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  return result;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatPeriodKey(key: string, period: "week" | "month" | "year"): string {
  if (period === "week") {
    const [year, week] = key.split("-W");
    return `Week ${week}, ${year}`;
  } else if (period === "month") {
    const [year, month] = key.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  } else {
    return key;
  }
}

