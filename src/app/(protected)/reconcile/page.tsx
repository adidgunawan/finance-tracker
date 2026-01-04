"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/hooks/useAccounts";
import { toast } from "sonner";
import {
  createReconciliationSession,
  getReconciliationSessions,
  getReconciliationSession,
  type ReconciliationSession,
  type ReconciliationMatch,
} from "@/actions/reconciliation";
import { ReconciliationView } from "@/components/reconcile/ReconciliationView";
import { ReconciliationSessionList } from "@/components/reconcile/ReconciliationSessionList";
import { UploadIcon, FileTextIcon } from "@radix-ui/react-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function ReconcilePage() {
  const { accounts, loading: accountsLoading, getAccountsByType } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [sessions, setSessions] = useState<ReconciliationSession[]>([]);
  const [currentSession, setCurrentSession] = useState<(ReconciliationSession & { matches: ReconciliationMatch[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Filter to asset accounts only
  const assetAccounts = getAccountsByType("asset").filter((acc) => acc.is_active);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await getReconciliationSessions();
      setSessions(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith(".csv")) {
        toast.error("Please select a CSV file");
        return;
      }
      setCsvFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedAccountId) {
      toast.error("Please select an account");
      return;
    }

    if (!csvFile) {
      toast.error("Please select a CSV file");
      return;
    }

    try {
      setUploading(true);
      const session = await createReconciliationSession(selectedAccountId, csvFile);
      toast.success("CSV uploaded and parsed successfully");
      
      // Load full session with matches
      const fullSession = await getReconciliationSession(session.id);
      setCurrentSession(fullSession);
      setCsvFile(null);
      
      // Reset file input
      const fileInput = document.getElementById("csv-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      // Reload sessions list
      await loadSessions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload CSV");
    } finally {
      setUploading(false);
    }
  };

  const handleSessionSelect = async (sessionId: string) => {
    try {
      setLoading(true);
      const session = await getReconciliationSession(sessionId);
      setCurrentSession(session);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  const handleSessionUpdate = async () => {
    if (currentSession) {
      await loadSessions();
      const updated = await getReconciliationSession(currentSession.id);
      setCurrentSession(updated as any);
    }
  };

  const handleSessionDelete = async (sessionId: string) => {
    const sessionToDelete = currentSession;
    await loadSessions();
    if (sessionToDelete && sessionToDelete.id === sessionId) {
      setCurrentSession(null);
    }
  };

  if (accountsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-[98%] mx-auto space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Bank Reconciliation</h1>
            <p className="text-muted-foreground mt-2">
              Match bank statements with your transactions
            </p>
          </div>
        </div>

        {!currentSession ? (
          <div className="space-y-6">
            {/* New Reconciliation Section */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">New Reconciliation</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="account-select">Select Account</Label>
                  <Select
                    value={selectedAccountId}
                    onValueChange={setSelectedAccountId}
                    disabled={uploading}
                  >
                    <SelectTrigger id="account-select">
                      <SelectValue placeholder="Select an asset account" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="csv-upload">Upload CSV File</Label>
                  <div className="flex items-center gap-4">
                    <input
                      id="csv-upload"
                      type="file"
                      accept=".csv,.CSV"
                      onChange={handleFileSelect}
                      disabled={uploading || !selectedAccountId}
                      className="flex-1 text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <Button
                      onClick={handleUpload}
                      disabled={!csvFile || !selectedAccountId || uploading}
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <UploadIcon className="mr-2 h-4 w-4" />
                          Upload & Parse
                        </>
                      )}
                    </Button>
                  </div>
                  {csvFile && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <FileTextIcon className="h-4 w-4" />
                      {csvFile.name}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Existing Sessions */}
            <ReconciliationSessionList
              sessions={sessions}
              loading={loading}
              onSessionSelect={handleSessionSelect}
              onSessionDelete={handleSessionDelete}
            />
          </div>
        ) : (
          <ReconciliationView
            session={currentSession}
            onBack={() => setCurrentSession(null)}
            onUpdate={handleSessionUpdate}
          />
        )}
      </div>
    </div>
  );
}

