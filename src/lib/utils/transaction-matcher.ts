/**
 * Transaction Matching Utility
 * Matches CSV transactions with existing transactions using date + amount
 */

import type { ParsedCSVTransaction } from "./csv-parser";
import type { Database } from "@/lib/supabase/types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export interface MatchSuggestion {
  transactionId: string;
  transaction: Transaction;
  confidence: "exact" | "high" | "medium" | "low";
  matchReason: string;
}

export interface MatchResult {
  csvTransaction: ParsedCSVTransaction;
  suggestions: MatchSuggestion[];
  bestMatch: MatchSuggestion | null;
}

/**
 * Compare two amounts with tolerance for floating point errors
 */
function amountsMatch(amount1: number, amount2: number, tolerance: number = 0.01): boolean {
  return Math.abs(amount1 - amount2) < tolerance;
}

/**
 * Compare two dates (ISO strings)
 */
function datesMatch(date1: string, date2: string): boolean {
  return date1 === date2;
}

/**
 * Find matching transactions for a CSV transaction
 * Matches by exact date + exact amount
 */
export function findMatchingTransactions(
  csvTransaction: ParsedCSVTransaction,
  existingTransactions: Transaction[]
): MatchSuggestion[] {
  const matches: MatchSuggestion[] = [];
  
  for (const transaction of existingTransactions) {
    // Check date match (exact)
    if (!datesMatch(csvTransaction.date, transaction.transaction_date)) {
      continue;
    }
    
    // Check amount match (exact with small tolerance)
    // For debits, CSV amount should match transaction amount
    // For credits, CSV amount should match transaction amount
    // Note: In the system, expenses have positive amounts, income has positive amounts
    // CSV debits are expenses, CSV credits are income
    
    let amountMatches = false;
    
    if (csvTransaction.type === "debit") {
      // Debit = expense, amount should match
      if (amountsMatch(csvTransaction.amount, transaction.amount)) {
        amountMatches = true;
      }
    } else if (csvTransaction.type === "credit") {
      // Credit = income, amount should match
      if (amountsMatch(csvTransaction.amount, transaction.amount)) {
        amountMatches = true;
      }
    }
    
    if (amountMatches) {
      matches.push({
        transactionId: transaction.id,
        transaction,
        confidence: "exact",
        matchReason: `Exact match: Date ${csvTransaction.date}, Amount ${csvTransaction.amount}`,
      });
    }
  }
  
  return matches;
}

/**
 * Auto-match all CSV transactions with existing transactions
 * Returns array of match results for each CSV transaction
 */
export function autoMatchAll(
  csvTransactions: ParsedCSVTransaction[],
  existingTransactions: Transaction[]
): MatchResult[] {
  return csvTransactions.map((csvTransaction) => {
    const suggestions = findMatchingTransactions(csvTransaction, existingTransactions);
    
    return {
      csvTransaction,
      suggestions,
      bestMatch: suggestions.length > 0 ? suggestions[0] : null,
    };
  });
}

/**
 * Get match statistics
 */
export function getMatchStatistics(matchResults: MatchResult[]): {
  total: number;
  matched: number;
  unmatched: number;
  multipleMatches: number;
} {
  const matched = matchResults.filter((r) => r.bestMatch !== null).length;
  const multipleMatches = matchResults.filter((r) => r.suggestions.length > 1).length;
  
  return {
    total: matchResults.length,
    matched,
    unmatched: matchResults.length - matched,
    multipleMatches,
  };
}




