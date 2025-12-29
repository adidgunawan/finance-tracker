"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const SUPPORTED_CURRENCIES = [
  { code: "USD", name: "US Dollar ($)" },
  { code: "EUR", name: "Euro (€)" },
  { code: "GBP", name: "British Pound (£)" },
  { code: "IDR", name: "Indonesian Rupiah (Rp)" },
  { code: "JPY", name: "Japanese Yen (¥)" },
  { code: "SGD", name: "Singapore Dollar (S$)" },
];

interface BulkCurrencyUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAccountIds: string[];
  onUpdate: (accountIds: string[], currency: string) => Promise<void>;
}

export function BulkCurrencyUpdateDialog({
  open,
  onOpenChange,
  selectedAccountIds,
  onUpdate,
}: BulkCurrencyUpdateDialogProps) {
  const [currency, setCurrency] = useState<string>("IDR");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (selectedAccountIds.length === 0) {
      toast.error("Please select at least one account");
      return;
    }

    if (!currency) {
      toast.error("Please select a currency");
      return;
    }

    setLoading(true);
    try {
      await onUpdate(selectedAccountIds, currency);
      toast.success(`Updated ${selectedAccountIds.length} account(s) to ${currency}`);
      onOpenChange(false);
      setCurrency("IDR");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update accounts");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Update Currency</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            {selectedAccountIds.length === 0
              ? "No accounts selected"
              : `${selectedAccountIds.length} account(s) selected`}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={loading || selectedAccountIds.length === 0}
          >
            {loading ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

