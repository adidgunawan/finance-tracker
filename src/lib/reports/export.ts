/**
 * Export report data to CSV format
 */
export function exportToCSV(
  data: any[],
  filename: string = "report.csv",
  headers?: string[]
) {
  if (data.length === 0) {
    alert("No data to export");
    return;
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Create CSV content
  const csvRows = [
    csvHeaders.join(","), // Header row
    ...data.map((row) =>
      csvHeaders
        .map((header) => {
          const value = row[header];
          // Handle values that might contain commas or quotes
          if (value === null || value === undefined) return "";
          const stringValue = String(value);
          if (stringValue.includes(",") || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",")
    ),
  ];

  const csvContent = csvRows.join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export transactions report to CSV
 */
export function exportTransactionsReport(
  transactions: any[],
  filters: any,
  filename?: string
) {
  const dateRange = filters.startDate && filters.endDate
    ? `${filters.startDate}_to_${filters.endDate}`
    : "all_time";

  const exportData = transactions.map((t) => ({
    Date: t.transaction_date,
    Type: t.type,
    Description: t.description,
    Amount: t.amount,
    Account: t.account_name,
    Payee: t.payee_payer || "",
  }));

  exportToCSV(
    exportData,
    filename || `transactions_report_${dateRange}.csv`,
    ["Date", "Type", "Description", "Amount", "Account", "Payee"]
  );
}

/**
 * Export time-based report to CSV
 */
export function exportTimeBasedReport(
  data: any[],
  period: string,
  filters: any,
  filename?: string
) {
  const dateRange = filters.startDate && filters.endDate
    ? `${filters.startDate}_to_${filters.endDate}`
    : "all_time";

  const exportData = data.map((item) => ({
    Period: item.period,
    Income: item.income,
    Expense: item.expense,
    Net: item.net,
  }));

  exportToCSV(
    exportData,
    filename || `${period}_report_${dateRange}.csv`,
    ["Period", "Income", "Expense", "Net"]
  );
}

