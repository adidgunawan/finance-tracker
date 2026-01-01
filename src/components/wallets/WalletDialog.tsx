"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setOpeningBalance } from "@/actions/wallets";
import type { Database } from "@/lib/supabase/types";

type Account = Database["public"]["Tables"]["chart_of_accounts"]["Row"];

interface WalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: Account | null;
  onSuccess?: () => void;
}

export function WalletDialog({
  open,
  onOpenChange,
  wallet,
  onSuccess,
}: WalletDialogProps) {
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && wallet) {
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
    }
  }, [open, wallet]);

  const handleSave = async () => {
    if (!wallet) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    if (!date) {
      toast.error("Please select a date");
      return;
    }

    setLoading(true);
    try {
      await setOpeningBalance(wallet.id, amountNum, date);
      toast.success("Opening balance set successfully");
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set opening balance");
    } finally {
      setLoading(false);
    }
  };

  if (!wallet) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Opening Balance</DialogTitle>
          <DialogDescription>
            Set the opening balance for {wallet.name}. This will create a double-entry transaction
            debiting the wallet and crediting an equity account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Currency: {wallet.currency || "USD"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !amount || !date}>
            {loading ? "Setting..." : "Set Opening Balance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}