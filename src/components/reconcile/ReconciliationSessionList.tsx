"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FileTextIcon, TrashIcon, CheckIcon } from "@radix-ui/react-icons";
import type { ReconciliationSession } from "@/actions/reconciliation";
import { deleteReconciliationSession } from "@/actions/reconciliation";
import { toast } from "sonner";

interface ReconciliationSessionListProps {
  sessions: ReconciliationSession[];
  loading: boolean;
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
}

export function ReconciliationSessionList({
  sessions,
  loading,
  onSessionSelect,
  onSessionDelete,
}: ReconciliationSessionListProps) {
  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast("Are you sure you want to delete this session?", {
      description: "This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await deleteReconciliationSession(sessionId);
            toast.success("Session deleted successfully");
            onSessionDelete(sessionId);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete session");
          }
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
    });
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <FileTextIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No reconciliation sessions yet</p>
          <p className="text-sm mt-2">Upload a CSV file to get started</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Recent Sessions</h2>
      <div className="space-y-2">
        {sessions.map((session) => (
          <Card
            key={session.id}
            className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
            onClick={() => onSessionSelect(session.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{session.filename}</span>
                  {session.status === "completed" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckIcon className="h-3 w-3 mr-1" />
                      Completed
                    </span>
                  )}
                  {session.status === "in_progress" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      In Progress
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {format(new Date(session.created_at), "MMM d, yyyy 'at' h:mm a")}
                  {" • "}
                  {session.parsed_data.transactions.length} transactions
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleDelete(session.id, e)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}


