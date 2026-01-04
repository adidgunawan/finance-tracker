"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getSettings, updateSettings } from "@/actions/settings";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GoogleDriveConnection } from "@/components/settings/GoogleDriveConnection";
import { ALL_CURRENCIES, getCurrencyDisplayName } from "@/lib/currencies";

export default function SettingsPage() {
  const [currency, setCurrency] = useState("IDR");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    loadSettings();
    
    // Handle OAuth callback messages
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    
    if (success === "google_drive_connected") {
      toast.success("Google Drive connected successfully!");
      // Remove query param from URL
      window.history.replaceState({}, "", "/settings");
    } else if (error) {
      toast.error(`Failed to connect Google Drive: ${decodeURIComponent(error)}`);
      // Remove query param from URL
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await getSettings();
      if (settings?.default_currency) {
        setCurrency(settings.default_currency);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      // Optional: Redirect to login if unauthorized, but middleware handles this mostly.
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSettings({ default_currency: currency });
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
         <div className="animate-pulse text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your application preferences and defaults
          </p>
        </div>

        <Card className="p-8 space-y-8">
          <div className="space-y-4">
            <div className="border-b pb-4">
               <h2 className="text-lg font-semibold text-foreground">Currency & Localization</h2>
               <p className="text-sm text-muted-foreground">Set your preferred currency for all transactions.</p>
            </div>
            
            <div className="grid gap-2">
                <Label className="text-sm font-medium">Default Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                    {ALL_CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                        {getCurrencyDisplayName(currency.code)}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
          </div>

          <div className="pt-6 border-t flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </Card>

        <GoogleDriveConnection />
      </div>
    </div>
  );
}
