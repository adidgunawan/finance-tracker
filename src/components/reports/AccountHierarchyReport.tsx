"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronRightIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { useCurrency } from "@/hooks/useCurrency";
import type { AccountHierarchyItem } from "@/actions/reports";

interface AccountHierarchyReportProps {
  data: AccountHierarchyItem[];
}

export function AccountHierarchyReport({ data }: AccountHierarchyReportProps) {
  const { format: formatCurrency } = useCurrency();

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
      <h3 className="text-lg font-semibold mb-4">Account Hierarchy</h3>
      <div className="space-y-1">
        {data.map((account) => (
          <AccountNode key={account.account_id} account={account} />
        ))}
      </div>
    </Card>
  );
}

interface AccountNodeProps {
  account: AccountHierarchyItem;
}

function AccountNode({ account }: AccountNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { format: formatCurrency } = useCurrency();
  const hasChildren = account.children && account.children.length > 0;

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
                  account.balance >= 0 ? "text-primary" : "text-destructive"
                }`}
              >
                {formatCurrency(Math.abs(account.balance))}
              </div>
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

