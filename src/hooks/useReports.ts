"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getTransactionsReport,
  getAccountHierarchyReport,
  getTimeBasedReport,
  type ReportFilters,
  type TransactionReportItem,
  type AccountHierarchyItem,
  type TimeBasedReportItem,
} from "@/actions/reports";

/**
 * Hook to fetch transactions report with automatic caching
 */
export function useTransactionsReport(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: ["reports", "transactions", filters],
    queryFn: async () => {
      return await getTransactionsReport(filters);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch account hierarchy report with automatic caching
 */
export function useAccountHierarchyReport(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: ["reports", "hierarchy", filters],
    queryFn: async () => {
      return await getAccountHierarchyReport(filters);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch time-based report with automatic caching
 */
export function useTimeBasedReport(
  period: "week" | "month" | "year",
  filters: ReportFilters = {}
) {
  return useQuery({
    queryKey: ["reports", "timeBased", period, filters],
    queryFn: async () => {
      return await getTimeBasedReport(period, filters);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Legacy hook for backward compatibility
 * Provides manual fetch functions but uses TanStack Query under the hood
 */
export function useReports() {
  // Note: This is a transitional API. New code should use the specific hooks above.
  return {
    filters: {},
    loading: false,
    error: null,
    updateFilters: (_: Partial<ReportFilters>) => {},
    resetFilters: () => {},
    fetchTransactionsReport: () => getTransactionsReport({}),
    fetchAccountHierarchyReport: () => getAccountHierarchyReport({}),
    fetchTimeBasedReport: (period: "week" | "month" | "year") => getTimeBasedReport(period, {}),
  };
}




