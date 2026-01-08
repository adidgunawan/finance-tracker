"use server";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "./base";
import { convertToBaseCurrencyBatch } from "@/lib/services/currency-batch";
import type { Database } from "@/lib/supabase/types";
import { 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  format, 
  eachDayOfInterval, 
  isSameDay, 
  startOfDay, 
  subDays 
} from "date-fns";
import { unstable_cache } from "next/cache";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type TransactionLine = Database["public"]["Tables"]["transaction_lines"]["Row"] & {
  transaction: Pick<Transaction, "currency" | "transaction_date"> | null;
  account: Pick<Database["public"]["Tables"]["chart_of_accounts"]["Row"], "id" | "name" | "type" | "currency" | "level" | "parent_id"> | null;
};

export interface DashboardInsights {
  financialOverview: {
    totalBalance: number;
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    incomeChangePct: number;
    expenseChangePct: number;
  };
  expenseBreakdown: {
    category: string;
    amount: number;
    percentage: number;
    currency: string;
  }[];
  incomeBreakdown: {
    category: string;
    amount: number;
    percentage: number;
    currency: string;
  }[];
  dailyTrend: {
    date: string;
    income: number;
    expense: number;
  }[];
  monthlyComparison: {
    income: { current: number; previous: number };
    expense: { current: number; previous: number };
  };
  recentTransactions: Transaction[];
}

export const getDashboardInsights = async (): Promise<DashboardInsights> => {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  // Cache the result for 5 minutes (user-specific)
  const getCachedInsights = unstable_cache(
    async (userId: string) => {
      return await fetchDashboardInsightsInternal(userId);
    },
    [`dashboard-insights-${session.user.id}`],
    { tags: [`dashboard-insights-${session.user.id}`], revalidate: 300 }
  );

  return await getCachedInsights(session.user.id);
};

// Clear cache helper (to be called on mutation)
export const revalidateDashboardInsights = async () => {
    // This is a placeholder since we can't invalidate specific tags from client easily
    // In a real app, you'd use revalidateTag in the server action that mutates data
    // For now, we rely on the time-based revalidation or we can use a server action to revalidate tag
};

async function fetchDashboardInsightsInternal(userId: string): Promise<DashboardInsights> {
  const supabase = createAdminClient();

  // 1. Get Settings (Base Currency)
  const { data: settingsData } = await supabase
    .from("settings")
    .select("default_currency")
    .eq("user_id", userId)
    .maybeSingle();
  const baseCurrency = settingsData?.default_currency || "IDR";

  // 2. Define Date Ranges
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const previousMonthStart = startOfMonth(subMonths(now, 1));
  const previousMonthEnd = endOfMonth(subMonths(now, 1));

  // 3. Parallel Data Fetching
  const [
    currentTransactionsResult,
    previousTransactionsResult,
    currentLinesResult,
    assetLinesResult,
    recentTransactionsResult
  ] = await Promise.all([
    // Current Month Transactions (for Summary & Trend)
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("transaction_date", currentMonthStart.toISOString().split("T")[0])
      .lte("transaction_date", currentMonthEnd.toISOString().split("T")[0]),
    
    // Previous Month Transactions (for Comparison)
    supabase
      .from("transactions")
      .select("amount, currency, type, transaction_date")
      .eq("user_id", userId)
      .gte("transaction_date", previousMonthStart.toISOString().split("T")[0])
      .lte("transaction_date", previousMonthEnd.toISOString().split("T")[0]),

    // Current Month Breakdown Lines (Expenses/Income categories)
    supabase
      .from("transaction_lines")
      .select(`
        debit_amount, 
        credit_amount, 
        transaction:transactions!inner(currency, transaction_date),
        account:chart_of_accounts!inner(id, name, type, currency, level, parent_id)
      `)
      .gt("transaction.transaction_date", subDays(currentMonthStart, 1).toISOString()) // Optimization hint?
      .gte("transaction.transaction_date", currentMonthStart.toISOString().split("T")[0])
      .lte("transaction.transaction_date", currentMonthEnd.toISOString().split("T")[0])
      .in("account.type", ["expense", "income"]),

    // All Lines for Asset Accounts (for Total Balance / Net Worth)
    // Note: We only need asset accounts.
    supabase
      .from("transaction_lines")
      .select(`
        debit_amount, 
        credit_amount,
        account:chart_of_accounts!inner(type, currency)
      `)
      .eq("account.type", "asset")
      .eq("account.user_id", userId), // Ensure it filters by user via join implicitly or explicitly? inner join on account filters by user if account has user_id, but safer to check.
      // Actually chart_of_accounts has user_id.
    
    // Recent Transactions
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10)
  ]);

  const currentTransactions = (currentTransactionsResult.data || []) as Transaction[];
  // Cast previous transactions slightly loosely as we selected fewer columns
  const previousTransactions = (previousTransactionsResult.data || []) as unknown as Transaction[];
  const breakdownLines = (currentLinesResult.data || []) as unknown as TransactionLine[];
  const assetLines = (assetLinesResult.data || []) as unknown as { debit_amount: number | null; credit_amount: number | null; account: { currency: string | null } }[];
  const recentTransactions = (recentTransactionsResult.data || []) as Transaction[];

  // --- PROCESSING: SUMMARY CARDS ---

  // Helper: Calculate totals in base currency
  const calculateTotal = async (txs: Transaction[], type: "income" | "expense") => {
    const filtered = txs.filter(t => t.type === type);
    const converted = await convertToBaseCurrencyBatch(
      filtered.map(t => ({ amount: t.amount, currency: t.currency || baseCurrency })),
      baseCurrency
    );
    return converted.reduce((sum, val) => sum + val, 0);
  };

  const [
    currIncome, 
    currExpense, 
    prevIncome, 
    prevExpense
  ] = await Promise.all([
    calculateTotal(currentTransactions, "income"),
    calculateTotal(currentTransactions, "expense"),
    calculateTotal(previousTransactions, "income"),
    calculateTotal(previousTransactions, "expense"),
  ]);

  const incomeChangePct = prevIncome === 0 ? (currIncome > 0 ? 100 : 0) : ((currIncome - prevIncome) / prevIncome) * 100;
  const expenseChangePct = prevExpense === 0 ? (currExpense > 0 ? 100 : 0) : ((currExpense - prevExpense) / prevExpense) * 100;

  // Processing Net Worth (Total Balance)
  // We need to convert each line to base currency? Or sum by currency first then convert?
  // Optimize: Group by currency first.
  const assetBalanceByCurrency = new Map<string, number>();
  
  for (const line of assetLines) {
    const currency = line.account.currency || baseCurrency;
    const debit = line.debit_amount || 0;
    const credit = line.credit_amount || 0;
    const net = debit - credit; // Assets: Debit increases
    
    assetBalanceByCurrency.set(currency, (assetBalanceByCurrency.get(currency) || 0) + net);
  }

  // Convert aggregated balances to base currency
  const balanceRequests = Array.from(assetBalanceByCurrency.entries()).map(([currency, amount]) => ({
    amount, currency
  }));
  const convertedBalances = await convertToBaseCurrencyBatch(balanceRequests, baseCurrency);
  const totalBalance = convertedBalances.reduce((sum, val) => sum + val, 0);


  // --- PROCESSING: BREAKDOWNS ---
  // Build account hierarchy map to find level 1 parents
  const accountHierarchyMap = new Map<string, { id: string; name: string; level: number; parent_id: string | null }>();
  
  for (const line of breakdownLines) {
    if (!line.account) continue;
    const acc = line.account as any;
    if (!accountHierarchyMap.has(acc.id)) {
      accountHierarchyMap.set(acc.id, {
        id: acc.id,
        name: acc.name,
        level: acc.level,
        parent_id: acc.parent_id
      });
    }
  }

  // Function to find level 1 parent account
  const findLevel1Parent = async (accountId: string): Promise<{ id: string; name: string } | null> => {
    const account = accountHierarchyMap.get(accountId);
    if (!account) return null;
    
    if (account.level === 1) {
      return { id: account.id, name: account.name };
    }
    
    // Need to fetch parent accounts if not in map
    if (account.parent_id) {
      let parent = accountHierarchyMap.get(account.parent_id);
      
      // If parent not in map, fetch it
      if (!parent) {
        const { data } = await supabase
          .from("chart_of_accounts")
          .select("id, name, level, parent_id")
          .eq("id", account.parent_id)
          .single();
        
        if (data) {
          parent = {
            id: data.id,
            name: data.name,
            level: data.level,
            parent_id: data.parent_id
          };
          accountHierarchyMap.set(data.id, parent);
        }
      }
      
      if (parent) {
        if (parent.level === 1) {
          return { id: parent.id, name: parent.name };
        } else if (parent.parent_id) {
          // Recursively find level 1
          return findLevel1Parent(parent.id);
        }
      }
    }
    
    return null;
  };

  // We use breakdownLines which are transaction_lines linked to expense/income accounts
  // Unlike transactions table, these have the category (account name).
 
  // Group by category (Account Name) - now using level 1 parent
  const expenseMap = new Map<string, number>(); // Name -> Amount (in Base)
  const incomeMap = new Map<string, number>();

  // Use map to collect raw amounts by currency for each category to do batch conversion later?
  // Actually, we can just collect all items to convert.
  const expenseItemsToConvert: { amount: number, currency: string, category: string }[] = [];
  const incomeItemsToConvert: { amount: number, currency: string, category: string }[] = [];

  for (const line of breakdownLines) {
    if (!line.account || !line.transaction) continue;
    
    const acc = line.account as any;
    
    // Find level 1 parent for expense accounts
    let categoryName = acc.name;
    if (acc.type === "expense") {
      const level1Parent = await findLevel1Parent(acc.id);
      if (level1Parent) {
        categoryName = level1Parent.name;
      }
    }
    
    // Use transaction currency as the currency of the amount (standard double entry assumption in this app)
    const currency = line.transaction.currency || baseCurrency;
    // For Expense Accounts: Debit increases expense
    // For Income Accounts: Credit increases income
    
    if (acc.type === "expense") {
      const amount = (line.debit_amount || 0) - (line.credit_amount || 0); // Net Expense
      if (amount !== 0) {
        expenseItemsToConvert.push({ amount, currency, category: categoryName });
      }
    } else if (acc.type === "income") {
       const amount = (line.credit_amount || 0) - (line.debit_amount || 0); // Net Income
       if (amount !== 0) {
        incomeItemsToConvert.push({ amount, currency, category: categoryName });
       }
    }
  }

  // Convert
  const [convertedExpenses, convertedIncomes] = await Promise.all([
    convertToBaseCurrencyBatch(expenseItemsToConvert, baseCurrency),
    convertToBaseCurrencyBatch(incomeItemsToConvert, baseCurrency)
  ]);

  // Aggregate
  convertedExpenses.forEach((val, idx) => {
    const cat = expenseItemsToConvert[idx].category;
    expenseMap.set(cat, (expenseMap.get(cat) || 0) + val);
  });
  convertedIncomes.forEach((val, idx) => {
    const cat = incomeItemsToConvert[idx].category;
    incomeMap.set(cat, (incomeMap.get(cat) || 0) + val);
  });

  // Sort and Format Output
  const formatBreakdown = (map: Map<string, number>, total: number) => {
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total === 0 ? 0 : (amount / total) * 100,
        currency: baseCurrency
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const expenseBreakdown = formatBreakdown(expenseMap, currExpense);
  const incomeBreakdown = formatBreakdown(incomeMap, currIncome);

  // --- PROCESSING: DAILY TREND ---
  // Using currentTransactions (Transactions Table)
  const daysInMonth = eachDayOfInterval({ start: currentMonthStart, end: currentMonthEnd });
  const trendMap = new Map<string, { income: number; expense: number }>();
  
  // Initialize map
  daysInMonth.forEach(day => {
    trendMap.set(format(day, "yyyy-MM-dd"), { income: 0, expense: 0 });
  });

  // Iterate transactions and sum (Need conversion!)
  // We already calculated total Income/Expense which required conversion.
  // We need to do it again for each transaction for the daily trend?
  // We can reuse the result if we kept track of converted indices.
  // But wait, `calculateTotal` abstracted that away.
  // Let's just do a batch convert for all transactions mapped to their date.
  
  const dailyItemsToConvert = currentTransactions.map(t => ({
    amount: t.amount,
    currency: t.currency || baseCurrency,
    date: t.transaction_date,
    type: t.type
  }));

  const convertedDaily = await convertToBaseCurrencyBatch(dailyItemsToConvert, baseCurrency);

  convertedDaily.forEach((val, idx) => {
    const item = dailyItemsToConvert[idx];
    // Dates from DB are YYYY-MM-DD.
    // Ensure we handle timezone correctly or just use string matching for YYYY-MM-DD
    const dateKey = item.date; // Assuming string "YYYY-MM-DD"
    // Find matching entry (handle slight potential mismatches if any, but DB is strictly YYYY-MM-DD usually)
    
    // If dateKey is not in map (e.g. out of range slightly due to offsets?), skip or add?
    // It should be in range due to query filter.
    const entry = trendMap.get(dateKey);
    if (entry) {
        if (item.type === "income") entry.income += val;
        else if (item.type === "expense") entry.expense += val;
    }
  });

  const dailyTrend = daysInMonth.map(day => {
    const dateKey = format(day, "yyyy-MM-dd");
    const entry = trendMap.get(dateKey) || { income: 0, expense: 0 };
    return {
      date: dateKey, // or format(day, "d MMM")
      ...entry
    };
  });

  return {
    financialOverview: {
      totalBalance,
      totalIncome: currIncome,
      totalExpense: currExpense,
      netCashFlow: currIncome - currExpense,
      incomeChangePct,
      expenseChangePct
    },
    expenseBreakdown,
    incomeBreakdown,
    dailyTrend,
    monthlyComparison: {
      income: { current: currIncome, previous: prevIncome },
      expense: { current: currExpense, previous: prevExpense }
    },
    recentTransactions
  };
}
