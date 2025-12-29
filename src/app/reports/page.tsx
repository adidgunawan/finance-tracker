"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportSummary } from "@/components/reports/ReportSummary";
import { AccountHierarchyReport } from "@/components/reports/AccountHierarchyReport";
import { TimeBasedReport } from "@/components/reports/TimeBasedReport";
import { useReports } from "@/hooks/useReports";
import { useCurrency } from "@/hooks/useCurrency";
import { exportTransactionsReport, exportTimeBasedReport } from "@/lib/reports/export";
import { DownloadIcon } from "@radix-ui/react-icons";

export default function ReportsPage() {
  const {
    filters,
    loading,
    error,
    fetchTransactionsReport,
    fetchAccountHierarchyReport,
    fetchTimeBasedReport,
  } = useReports();
  const { format: formatCurrency } = useCurrency();

  const [activeTab, setActiveTab] = useState("summary");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accountHierarchy, setAccountHierarchy] = useState<any[]>([]);
  const [timeBasedData, setTimeBasedData] = useState<Record<string, any[]>>({});
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    transactionCount: 0,
  });

  const loadReports = async () => {
    try {
      // Load all reports
      const [txData, hierarchyData, weekData, monthData, yearData] = await Promise.all([
        fetchTransactionsReport(),
        fetchAccountHierarchyReport(),
        fetchTimeBasedReport("week"),
        fetchTimeBasedReport("month"),
        fetchTimeBasedReport("year"),
      ]);

      setTransactions(txData);
      setAccountHierarchy(hierarchyData);

      setTimeBasedData({
        week: weekData,
        month: monthData,
        year: yearData,
      });

      // Calculate summary
      const income = txData
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = txData
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      setSummary({
        totalIncome: income,
        totalExpense: expense,
        transactionCount: txData.length,
      });
    } catch (err) {
      console.error("Failed to load reports:", err);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

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
            <div className="text-destructive">Error: {error}</div>
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

        <ReportFilters onApply={loadReports} />

        {loading ? (
          <Card className="p-6">
            <div className="text-center text-muted-foreground">Loading reports...</div>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="hierarchy">Account Hierarchy</TabsTrigger>
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
