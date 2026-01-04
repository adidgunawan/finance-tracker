"use client";

import { useState, useCallback } from "react";
import {
  getTransactionsReport,
  getAccountHierarchyReport,
  getTimeBasedReport,
  type ReportFilters,
  type TransactionReportItem,
  type AccountHierarchyItem,
  type TimeBasedReportItem,
} from "@/actions/reports";

export function useReports() {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFilters = useCallback((newFilters: Partial<ReportFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);

  const fetchTransactionsReport = useCallback(async (): Promise<
    TransactionReportItem[]
  > => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTransactionsReport(filters);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch report";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchAccountHierarchyReport = useCallback(async (): Promise<
    AccountHierarchyItem[]
  > => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAccountHierarchyReport(filters);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch report";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchTimeBasedReport = useCallback(
    async (period: "week" | "month" | "year"): Promise<TimeBasedReportItem[]> => {
      setLoading(true);
      setError(null);
      try {
        const data = await getTimeBasedReport(period, filters);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch report";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  return {
    filters,
    loading,
    error,
    updateFilters,
    resetFilters,
    fetchTransactionsReport,
    fetchAccountHierarchyReport,
    fetchTimeBasedReport,
  };
}



