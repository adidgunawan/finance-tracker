"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/lib/supabase/types";

type Account = Database["public"]["Tables"]["chart_of_accounts"]["Row"];
type AccountType = Account["type"];

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
  accounts: Account[];
  onSave: (data: {
    name: string;
    type: AccountType;
    parent_id: string | null;
    level: number;
  }) => Promise<void>;
}

export function AccountDialog({
  open,
  onOpenChange,
  account,
  accounts,
  onSave,
}: AccountDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("asset");
  const [parentId, setParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setParentId(account.parent_id);
    } else {
      setName("");
      setType("asset");
      setParentId(null);
    }
  }, [account, open]);

  const getLevel = () => {
    if (!parentId) return 1;
    const parent = accounts.find((a) => a.id === parentId);
    return parent ? parent.level + 1 : 1;
  };

  const getAvailableParents = () => {
    if (!type) return [];
    
    // Only show accounts of the same type
    const sameTypeAccounts = accounts.filter((a) => a.type === type);
    
    // If editing, exclude self and descendants
    if (account) {
      return sameTypeAccounts.filter((a) => {
        if (a.id === account.id) return false;
        // Exclude if this account is a descendant
        let current = a;
        while (current.parent_id) {
          if (current.parent_id === account.id) return false;
          const parent = accounts.find((p) => p.id === current.parent_id);
          if (!parent) break;
          current = parent;
        }
        return a.level < 3; // Can only be parent if level < 3
      });
    }
    
    return sameTypeAccounts.filter((a) => a.level < 3);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    const level = getLevel();
    if (level > 3) {
      alert("Maximum account hierarchy depth is 3 levels");
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        type,
        parent_id: parentId,
        level,
      });
      onOpenChange(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {account ? "Edit Account" : "New Account"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Account Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cash, Bank, Salary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">
              Account Type
            </Label>
            <Select
              value={type}
              onValueChange={(value) => {
                setType(value as AccountType);
                setParentId(null); // Reset parent when type changes
              }}
              disabled={!!account} // Can't change type when editing
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asset">Asset</SelectItem>
                <SelectItem value="liability">Liability</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent">
              Parent Account (Optional)
            </Label>
            <Select
              value={parentId || "none"}
              onValueChange={(value) => setParentId(value === "none" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="None (Top Level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Top Level)</SelectItem>
                {getAvailableParents().map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name} (Level {parent.level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Current level: {getLevel()} (Max: 3)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !name.trim()}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
