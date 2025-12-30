"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getUserDriveTokens, revokeTokens } from "@/actions/google-drive";
import { toast } from "sonner";
import { Check, X, ExternalLink } from "lucide-react";

export function GoogleDriveConnection() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    checkConnection();
    
    // Check connection status when component mounts or when returning from OAuth
    const interval = setInterval(() => {
      checkConnection();
    }, 2000); // Check every 2 seconds for a short period
    
    // Clear interval after 10 seconds
    setTimeout(() => clearInterval(interval), 10000);
    
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      setLoading(true);
      const tokens = await getUserDriveTokens();
      setConnected(!!tokens);
    } catch (error) {
      console.error("Failed to check Google Drive connection:", error);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = "/api/auth/google";
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Google Drive? You won't be able to upload files until you reconnect.")) {
      return;
    }

    try {
      setDisconnecting(true);
      await revokeTokens();
      setConnected(false);
      toast.success("Google Drive disconnected successfully");
    } catch (error) {
      console.error("Failed to disconnect Google Drive:", error);
      toast.error(error instanceof Error ? error.message : "Failed to disconnect Google Drive");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Google Drive</h3>
            <p className="text-sm text-muted-foreground">Checking connection status...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Google Drive</h3>
            <p className="text-sm text-muted-foreground">
              Connect your Google Drive to upload transaction attachments
            </p>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="text-sm font-medium">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <X className="h-5 w-5" />
                <span className="text-sm font-medium">Not Connected</span>
              </div>
            )}
          </div>
        </div>

        {connected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your Google Drive is connected. Files will be uploaded to your Drive.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open("https://drive.google.com", "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Google Drive
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Google Drive account to enable file uploads for transactions.
              Files will be stored in your personal Google Drive.
            </p>
            <Button onClick={handleConnect}>
              Connect Google Drive
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

