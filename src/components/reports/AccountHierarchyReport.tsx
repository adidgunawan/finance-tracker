"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRightIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { useCurrency } from "@/hooks/useCurrency";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import type { AccountHierarchyItem } from "@/actions/reports";

interface AccountHierarchyReportProps {
  data: AccountHierarchyItem[];
}

export function AccountHierarchyReport({ data }: AccountHierarchyReportProps) {
  const { format: formatCurrency } = useCurrency();

  // Group accounts by type
  const accountsByType = useMemo(() => {
    const grouped: Record<string, AccountHierarchyItem[]> = {
      asset: [],
      liability: [],
      income: [],
      expense: [],
    };

    data.forEach((account) => {
      if (grouped[account.account_type]) {
        grouped[account.account_type].push(account);
      }
    });

    return grouped;
  }, [data]);

  const typeLabels: Record<string, string> = {
    asset: "Assets",
    liability: "Liabilities",
    income: "Income",
    expense: "Expenses",
  };

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          No account data available for the selected period.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Balance Sheet</h3>
      <div className="space-y-4">
        {(["asset", "liability", "income", "expense"] as const).map((type) => {
          const typeAccounts = accountsByType[type];
          if (typeAccounts.length === 0) return null;

          return (
            <AccountTypeGroup
              key={type}
              type={type}
              label={typeLabels[type]}
              accounts={typeAccounts}
            />
          );
        })}
      </div>
    </Card>
  );
}

interface AccountTypeGroupProps {
  type: "asset" | "liability" | "income" | "expense";
  label: string;
  accounts: AccountHierarchyItem[];
}

function AccountTypeGroup({ type, label, accounts }: AccountTypeGroupProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Calculate total balance using converted balances for accurate totals
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, account) => {
      return sum + (account.converted_balance ?? account.balance ?? 0);
    }, 0);
  }, [accounts]);

  const { format: formatCurrency } = useCurrency();

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 hover:bg-accent transition-colors">
            <div className="flex items-center gap-2">
              {isOpen ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
              <h4 className="text-base font-semibold capitalize">{label}</h4>
              <Badge variant="outline" className="ml-2">
                {accounts.length}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total</div>
              <div
                className={`text-sm font-semibold ${
                  totalBalance >= 0 ? "text-primary" : "text-destructive"
                }`}
              >
                {formatCurrency(Math.abs(totalBalance))}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-1 p-2">
            {accounts.map((account) => (
              <AccountNode key={account.account_id} account={account} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface AccountNodeProps {
  account: AccountHierarchyItem;
}

function AccountNode({ account }: AccountNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { format: formatCurrency } = useCurrency();
  const { baseCurrency } = useCurrencyConversion();
  const hasChildren = account.children && account.children.length > 0;

  const showConversion = account.currency && account.currency !== baseCurrency && account.converted_balance !== undefined;

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors"
        style={{ paddingLeft: `${(account.level - 1) * 24}px` }}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
            )
          ) : (
            <span className="w-4" />
          )}
        </button>

        <div className="flex-1 flex items-center justify-between">
          <div>
            <span className="text-sm text-foreground font-medium">
              {account.account_name}
            </span>
            <span className="ml-2 text-xs text-muted-foreground capitalize">
              {account.account_type}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <div className="text-muted-foreground">Balance</div>
              <div
                className={`font-semibold ${
                  (account.original_balance !== undefined ? account.original_balance : account.balance) >= 0 
                    ? "text-primary" 
                    : "text-destructive"
                }`}
              >
                {formatCurrency(Math.abs(
                  account.original_balance !== undefined 
                    ? account.original_balance 
                    : account.balance || 0
                ), { currency: account.currency || undefined })}
              </div>
              {showConversion && account.converted_balance !== undefined && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  ≈ {formatCurrency(Math.abs(account.converted_balance))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {account.children!.map((child) => (
            <AccountNode key={child.account_id} account={child} />
          ))}
        </div>
      )}
    </div>
  );
}

