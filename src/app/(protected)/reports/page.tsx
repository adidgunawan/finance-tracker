"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportSummary } from "@/components/reports/ReportSummary";
import { AccountHierarchyReport } from "@/components/reports/AccountHierarchyReport";
import { TimeBasedReport } from "@/components/reports/TimeBasedReport";
import {
  useTransactionsReport,
  useAccountHierarchyReport,
  useTimeBasedReport,
} from "@/hooks/useReports";
import { useCurrency } from "@/hooks/useCurrency";
import { exportTransactionsReport, exportTimeBasedReport } from "@/lib/reports/export";
import { DownloadIcon, ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { getMonthRange } from "@/lib/utils/dateRange";
import { format, subMonths, addMonths, isSameMonth } from "date-fns";

export default function ReportsPage() {
  const { format: formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState("summary");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  // Calculate filter based on selected month
  const filters = useMemo(() => {
    const monthRange = getMonthRange(selectedMonth);
    return {
      startDate: monthRange.start.toISOString().split("T")[0],
      endDate: monthRange.end.toISOString().split("T")[0],
    };
  }, [selectedMonth]);

  // Fetch all reports with automatic caching
  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useTransactionsReport(filters);

  const {
    data: accountHierarchy = [],
    isLoading: hierarchyLoading,
    error: hierarchyError,
  } = useAccountHierarchyReport(filters);

  const {
    data: weekData = [],
    isLoading: weekLoading,
  } = useTimeBasedReport("week", filters);

  const {
    data: monthData = [],
    isLoading: monthLoading,
  } = useTimeBasedReport("month", filters);

  const {
    data: yearData = [],
    isLoading: yearLoading,
  } = useTimeBasedReport("year", filters);

  // Combine loading states
  const loading = transactionsLoading || hierarchyLoading || weekLoading || monthLoading || yearLoading;
  const error = transactionsError || hierarchyError;

  // Calculate summary from transactions
  const summary = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome: income,
      totalExpense: expense,
      transactionCount: transactions.length,
    };
  }, [transactions]);

  const timeBasedData = useMemo(
    () => ({
      week: weekData,
      month: monthData,
      year: yearData,
    }),
    [weekData, monthData, yearData]
  );

  const handlePreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  const handleThisMonth = () => {
    setSelectedMonth(new Date());
  };

  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  const handleExport = () => {
    if (activeTab === "summary" || activeTab === "hierarchy") {
      exportTransactionsReport(transactions, filters);
    } else if (activeTab === "time") {
      const period = "month"; // Default to monthly
      exportTimeBasedReport(timeBasedData[period] || [], period, filters);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-[98%] mx-auto">
          <Card className="p-6">
            <div className="text-destructive">
              Error: {error instanceof Error ? error.message : String(error)}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-[98%] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-1">
              Financial reports and analytics
            </p>
          </div>
          <Button onClick={handleExport} variant="outline">
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousMonth}
              className="h-9 w-9"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant={isCurrentMonth ? "default" : "outline"}
                onClick={handleThisMonth}
                className="min-w-[140px]"
              >
                {isCurrentMonth ? "This Month" : format(selectedMonth, "MMMM yyyy")}
              </Button>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              className="h-9 w-9"
              disabled={isCurrentMonth}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {loading ? (
          <Card className="p-6">
            <div className="text-center text-muted-foreground">Loading reports...</div>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="hierarchy">Balance Sheet</TabsTrigger>
              <TabsTrigger value="time">Time-Based</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <ReportSummary
                totalIncome={summary.totalIncome}
                totalExpense={summary.totalExpense}
                transactionCount={summary.transactionCount}
                filters={filters}
              />
            </TabsContent>

            <TabsContent value="hierarchy">
              <AccountHierarchyReport data={accountHierarchy} />
            </TabsContent>

            <TabsContent value="time" className="space-y-4">
              <Tabs defaultValue="month">
                <TabsList>
                  <TabsTrigger value="week">Weekly</TabsTrigger>
                  <TabsTrigger value="month">Monthly</TabsTrigger>
                  <TabsTrigger value="year">Yearly</TabsTrigger>
                </TabsList>
                <TabsContent value="week">
                  <TimeBasedReport data={timeBasedData.week || []} period="week" />
                </TabsContent>
                <TabsContent value="month">
                  <TimeBasedReport data={timeBasedData.month || []} period="month" />
                </TabsContent>
                <TabsContent value="year">
                  <TimeBasedReport data={timeBasedData.year || []} period="year" />
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
