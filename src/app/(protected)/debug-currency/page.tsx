"use client";

import { useEffect, useState } from "react";
import { debugCurrencyData, fixTransactionCurrencies } from "@/actions/debug";
import { Button } from "@/components/ui/button";

export default function DebugPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<any>(null);

  const loadData = () => {
    setLoading(true);
    debugCurrencyData().then((result) => {
      setData(result);
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFix = async () => {
    if (!confirm("This will update all transactions to use the currency from their associated asset accounts. Continue?")) {
      return;
    }

    setFixing(true);
    try {
      const result = await fixTransactionCurrencies();
      setFixResult(result);
      alert(`Fixed ${result.totalFixed} transactions out of ${result.totalChecked} checked!`);
      // Reload data
      loadData();
    } catch (err) {
      console.error(err);
      alert("Error fixing currencies: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setFixing(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Currency Debug Info</h1>
        <Button 
          onClick={handleFix} 
          disabled={fixing}
          variant="destructive"
        >
          {fixing ? "Fixing..." : "🔧 Fix Currency Mismatches"}
        </Button>
      </div>

      {fixResult && (
        <div className="bg-green-500/10 border border-green-500 p-4 rounded-lg">
          <h3 className="font-semibold text-green-700 mb-2">✅ Fix Complete</h3>
          <p>Checked: {fixResult.totalChecked} transactions</p>
          <p>Fixed: {fixResult.totalFixed} transactions</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-card p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Default Currency in Settings</h2>
          <p className="text-xl font-mono">{data?.defaultCurrency}</p>
        </div>

        <div className="bg-card p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Asset Accounts</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Currency</th>
                </tr>
              </thead>
              <tbody>
                {data?.assetAccounts.map((acc: any) => (
                  <tr key={acc.id} className="border-b">
                    <td className="p-2">{acc.name}</td>
                    <td className="p-2">{acc.type}</td>
                    <td className="p-2 font-mono font-bold">{acc.currency || 'NULL'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">January 2026 Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-left p-2">Currency</th>
                </tr>
              </thead>
              <tbody>
                {data?.januaryTransactions.map((tx: any) => {
                  const isWrong = tx.currency === 'USD';
                  return (
                    <tr key={tx.id} className={`border-b ${isWrong ? 'bg-red-500/10' : ''}`}>
                      <td className="p-2">{tx.transaction_date}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          tx.type === 'income' ? 'bg-green-500/20 text-green-700' :
                          tx.type === 'expense' ? 'bg-red-500/20 text-red-700' :
                          'bg-blue-500/20 text-blue-700'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-2">{tx.description}</td>
                      <td className="p-2 text-right font-mono">{tx.amount.toLocaleString()}</td>
                      <td className={`p-2 font-mono font-bold ${isWrong ? 'text-red-600' : 'text-green-600'}`}>
                        {tx.currency || 'NULL'}
                        {isWrong && ' ⚠️'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
