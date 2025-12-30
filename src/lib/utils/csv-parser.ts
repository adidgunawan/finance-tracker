/**
 * BCA Bank Statement CSV Parser
 * Parses BCA bank statement CSV files and extracts transaction data
 */

export interface ParsedCSVTransaction {
  date: string; // ISO date string (YYYY-MM-DD)
  description: string;
  branch: string;
  amount: number;
  type: "credit" | "debit";
  balance: number;
  rawRow: string; // Original CSV row for reference
}

export interface ParsedCSVData {
  accountNumber?: string;
  accountName?: string;
  currency?: string;
  openingBalance?: number;
  closingBalance?: number;
  totalCredit?: number;
  totalDebit?: number;
  transactions: ParsedCSVTransaction[];
}

/**
 * Parse BCA CSV date format ('DD/MM' or 'DD/MM/YY')
 * Assumes current year if year not specified
 */
function parseBCADate(dateStr: string): Date {
  // Remove leading quote if present
  const cleanDate = dateStr.replace(/^'/, "");
  
  // Split by /
  const parts = cleanDate.split("/");
  if (parts.length < 2) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parts.length >= 3 
    ? parseInt(parts[2], 10) 
    : new Date().getFullYear();
  
  // Handle 2-digit years
  const fullYear = year < 100 
    ? (year < 50 ? 2000 + year : 1900 + year)
    : year;
  
  const date = new Date(fullYear, month, day);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  
  return date;
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse amount string to number
 */
function parseAmount(amountStr: string): number {
  // Remove commas and convert to number
  const cleanAmount = amountStr.replace(/,/g, "");
  const amount = parseFloat(cleanAmount);
  if (isNaN(amount)) {
    throw new Error(`Invalid amount: ${amountStr}`);
  }
  return amount;
}

/**
 * Extract merchant/payee name from description
 * BCA descriptions often have merchant names at the end
 */
function extractPayee(description: string): string | null {
  // Try to extract merchant name from common patterns
  // Examples: "QR  014           00000.00CAPTAIN RU" -> "CAPTAIN RU"
  // "SHOPEE      5157855189" -> "SHOPEE"
  const patterns = [
    /([A-Z][A-Z0-9\s]{2,})$/i, // Uppercase text at end
    /([A-Z][A-Z\s]+)(?:\s+\d+)?$/i, // Uppercase words at end
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      const payee = match[1].trim();
      if (payee.length > 2) {
        return payee;
      }
    }
  }
  
  return null;
}

/**
 * Parse BCA CSV file content
 */
export function parseBCACSV(csvContent: string): ParsedCSVData {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
  const result: ParsedCSVData = {
    transactions: [],
  };
  
  let inTransactionSection = false;
  let transactionStartIndex = -1;
  
  // Find transaction section
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is the header row for transactions
    if (line.includes("Tanggal") && line.includes("Keterangan") && line.includes("Jumlah")) {
      inTransactionSection = true;
      transactionStartIndex = i + 1;
      continue;
    }
    
    // Parse header information
    if (!inTransactionSection) {
      if (line.includes("No. Rekening") || line.includes("No Rekening")) {
        // Format: No. Rekening,=,'3850564531
        const parts = line.split(",");
        if (parts.length >= 3) {
          const value = parts[2]?.trim().replace(/^['"]|['"]$/g, "");
          if (value) result.accountNumber = value;
        } else {
          // Fallback to regex
          const match = line.match(/['"]?(\d+)['"]?/);
          if (match) result.accountNumber = match[1];
        }
      }
      if (line.includes("Nama") && !line.includes("Tanggal")) {
        // Format: Nama,=,ADI DHARMA GUNAWAN
        const parts = line.split(",");
        if (parts.length >= 3) {
          result.accountName = parts[2]?.trim().replace(/^['"]|['"]$/g, "") || undefined;
        }
      }
      if (line.includes("Mata Uang") || line.includes("Currency")) {
        // Format: Mata Uang,=,IDR
        const parts = line.split(",");
        if (parts.length >= 3) {
          result.currency = parts[2]?.trim().replace(/^['"]|['"]$/g, "") || undefined;
        }
      }
    }
    
    // Parse footer information (can appear anywhere after transactions)
    // Format: Saldo Awal,=,50000.94
    if (line.includes("Saldo Awal")) {
      const parts = line.split(",");
      if (parts.length >= 3) {
        const value = parts[2]?.trim();
        if (value) {
          try {
            result.openingBalance = parseAmount(value);
          } catch (e) {
            // Fallback to regex
            const match = line.match(/(\d+(?:\.\d+)?)/);
            if (match) result.openingBalance = parseAmount(match[1]);
          }
        }
      } else {
        // Fallback to regex
        const match = line.match(/(\d+(?:\.\d+)?)/);
        if (match) result.openingBalance = parseAmount(match[1]);
      }
    }
    if (line.includes("Saldo Akhir")) {
      const parts = line.split(",");
      if (parts.length >= 3) {
        const value = parts[2]?.trim();
        if (value) {
          try {
            result.closingBalance = parseAmount(value);
          } catch (e) {
            const match = line.match(/(\d+(?:\.\d+)?)/);
            if (match) result.closingBalance = parseAmount(match[1]);
          }
        }
      } else {
        const match = line.match(/(\d+(?:\.\d+)?)/);
        if (match) result.closingBalance = parseAmount(match[1]);
      }
    }
    if (line.includes("Kredit") && !line.includes("Tanggal")) {
      const parts = line.split(",");
      if (parts.length >= 3) {
        const value = parts[2]?.trim();
        if (value) {
          try {
            result.totalCredit = parseAmount(value);
          } catch (e) {
            const match = line.match(/(\d+(?:\.\d+)?)/);
            if (match) result.totalCredit = parseAmount(match[1]);
          }
        }
      } else {
        const match = line.match(/(\d+(?:\.\d+)?)/);
        if (match) result.totalCredit = parseAmount(match[1]);
      }
    }
    if (line.includes("Debet") && !line.includes("Tanggal") && !line.includes("DEBIT")) {
      const parts = line.split(",");
      if (parts.length >= 3) {
        const value = parts[2]?.trim();
        if (value) {
          try {
            result.totalDebit = parseAmount(value);
          } catch (e) {
            const match = line.match(/(\d+(?:\.\d+)?)/);
            if (match) result.totalDebit = parseAmount(match[1]);
          }
        }
      } else {
        const match = line.match(/(\d+(?:\.\d+)?)/);
        if (match) result.totalDebit = parseAmount(match[1]);
      }
    }
  }
  
  // Parse transactions
  if (transactionStartIndex >= 0) {
    for (let i = transactionStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Stop at footer rows
      if (line.includes("Saldo Awal") || line.includes("Kredit") || line.includes("Debet") || line.includes("Saldo Akhir")) {
        break;
      }
      
      // Parse transaction row
      // Format: Tanggal,Keterangan,Cabang,Jumlah,,Saldo
      // Note: Some rows may have different number of commas
      const parts = line.split(",");
      
      if (parts.length < 4) continue;
      
      try {
        const dateStr = parts[0]?.trim() || "";
        const description = parts[1]?.trim() || "";
        const branch = parts[2]?.trim() || "";
        const amountStr = parts[3]?.trim() || "";
        const typeStr = parts[4]?.trim() || "";
        const balanceStr = parts[5]?.trim() || "";
        
        // Skip if missing essential fields
        if (!dateStr || !amountStr) continue;
        
        // Parse date
        const date = parseBCADate(dateStr);
        const dateISO = formatDateISO(date);
        
        // Parse amount
        const amount = parseAmount(amountStr);
        
        // Determine type from CR/DB or from amount sign
        let type: "credit" | "debit";
        if (typeStr === "CR" || typeStr === "CREDIT") {
          type = "credit";
        } else if (typeStr === "DB" || typeStr === "DEBIT") {
          type = "debit";
        } else {
          // Infer from context (debits reduce balance, credits increase)
          // This is a fallback
          type = "debit";
        }
        
        // Parse balance if available
        const balance = balanceStr ? parseAmount(balanceStr) : 0;
        
        result.transactions.push({
          date: dateISO,
          description,
          branch,
          amount,
          type,
          balance,
          rawRow: line,
        });
      } catch (error) {
        // Skip invalid rows but log for debugging
        console.warn(`Failed to parse CSV row ${i + 1}:`, error, line);
        continue;
      }
    }
  }
  
  return result;
}

/**
 * Parse CSV file from File object
 */
export async function parseBCACSVFile(file: File): Promise<ParsedCSVData> {
  const text = await file.text();
  return parseBCACSV(text);
}

