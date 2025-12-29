import type { Database } from "../supabase/types";

type AccountType = Database["public"]["Tables"]["chart_of_accounts"]["Row"]["type"];

interface TransactionLine {
  account_id: string;
  debit_amount: number | null;
  credit_amount: number | null;
}

/**
 * Generate transaction lines for double-entry accounting
 * This abstracts the complexity of debits/credits from the UI
 */

export function generateIncomeLines(
  incomeAccountId: string,
  assetAccountId: string,
  amount: number
): TransactionLine[] {
  return [
    {
      account_id: assetAccountId,
      debit_amount: amount, // Asset increases (debit)
      credit_amount: null,
    },
    {
      account_id: incomeAccountId,
      debit_amount: null,
      credit_amount: amount, // Income increases (credit)
    },
  ];
}

/**
 * Generate income lines from multiple line items
 * Each item can have its own income account
 */
export function generateIncomeLinesFromItems(
  lineItems: Array<{
    incomeAccountId: string;
    amount: number;
  }>,
  assetAccountId: string
): TransactionLine[] {
  const lines: TransactionLine[] = [];
  let totalAmount = 0;

  // Group items by income account and sum amounts
  const accountTotals = new Map<string, number>();
  for (const item of lineItems) {
    const current = accountTotals.get(item.incomeAccountId) || 0;
    accountTotals.set(item.incomeAccountId, current + item.amount);
    totalAmount += item.amount;
  }

  // Create credit lines for each income account
  for (const [accountId, amount] of accountTotals.entries()) {
    lines.push({
      account_id: accountId,
      debit_amount: null,
      credit_amount: amount,
    });
  }

  // Create debit line for asset account (total of all income)
  lines.push({
    account_id: assetAccountId,
    debit_amount: totalAmount,
    credit_amount: null,
  });

  return lines;
}

export function generateExpenseLines(
  expenseAccountId: string,
  assetAccountId: string,
  amount: number
): TransactionLine[] {
  return [
    {
      account_id: expenseAccountId,
      debit_amount: amount, // Expense increases (debit)
      credit_amount: null,
    },
    {
      account_id: assetAccountId,
      debit_amount: null,
      credit_amount: amount, // Asset decreases (credit)
    },
  ];
}

/**
 * Generate expense lines from multiple line items
 * Each item can have its own expense account
 */
export function generateExpenseLinesFromItems(
  lineItems: Array<{
    expenseAccountId: string;
    amount: number;
  }>,
  assetAccountId: string
): TransactionLine[] {
  const lines: TransactionLine[] = [];
  let totalAmount = 0;

  // Group items by expense account and sum amounts
  const accountTotals = new Map<string, number>();
  for (const item of lineItems) {
    const current = accountTotals.get(item.expenseAccountId) || 0;
    accountTotals.set(item.expenseAccountId, current + item.amount);
    totalAmount += item.amount;
  }

  // Create debit lines for each expense account
  for (const [accountId, amount] of accountTotals.entries()) {
    lines.push({
      account_id: accountId,
      debit_amount: amount,
      credit_amount: null,
    });
  }

  // Create credit line for asset account (total of all expenses)
  lines.push({
    account_id: assetAccountId,
    debit_amount: null,
    credit_amount: totalAmount,
  });

  return lines;
}

export function generateTransferLines(
  fromAssetAccountId: string,
  toAssetAccountId: string,
  amount: number,
  feeAccountId?: string,
  feeAmount?: number
): TransactionLine[] {
  const lines: TransactionLine[] = [
    {
      account_id: fromAssetAccountId,
      debit_amount: null,
      credit_amount: amount + (feeAmount || 0), // From account decreases
    },
    {
      account_id: toAssetAccountId,
      debit_amount: amount, // To account increases
      credit_amount: null,
    },
  ];

  // Add fee as expense if provided
  if (feeAccountId && feeAmount && feeAmount > 0) {
    lines.push({
      account_id: feeAccountId,
      debit_amount: feeAmount, // Fee is an expense (debit)
      credit_amount: null,
    });
  }

  return lines;
}

/**
 * Validate that transaction lines are balanced (total debits = total credits)
 */
export function validateBalance(lines: TransactionLine[]): boolean {
  const totalDebits = lines.reduce(
    (sum, line) => sum + (line.debit_amount || 0),
    0
  );
  const totalCredits = lines.reduce(
    (sum, line) => sum + (line.credit_amount || 0),
    0
  );

  return Math.abs(totalDebits - totalCredits) < 0.01; // Allow for floating point errors
}

/**
 * Calculate account balance based on its type
 */
export function calculateAccountBalance(
  accountType: AccountType,
  totalDebits: number,
  totalCredits: number
): number {
  // Assets and Expenses increase with debits, decrease with credits
  if (accountType === "asset" || accountType === "expense") {
    return totalDebits - totalCredits;
  }
  // Liabilities and Income increase with credits, decrease with debits
  else {
    return totalCredits - totalDebits;
  }
}
