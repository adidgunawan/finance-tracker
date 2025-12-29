"use client";

import { useState, useMemo } from "react";
import { ChevronRightIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";

interface AccountTree {
  id: string;
  name: string;
  type: string;
  level: number;
  is_active: boolean;
  children: AccountTree[];
}

interface AccountTreeProps {
  accounts: AccountTree[];
  onEdit?: (account: AccountTree) => void;
  onToggleActive?: (account: AccountTree) => void;
}

export function AccountTreeView({ accounts, onEdit, onToggleActive }: AccountTreeProps) {
  // Group accounts by type
  const accountsByType = useMemo(() => {
    const grouped: Record<string, AccountTree[]> = {};
    accounts.forEach((account) => {
      if (!grouped[account.type]) {
        grouped[account.type] = [];
      }
      grouped[account.type].push(account);
    });
    return grouped;
  }, [accounts]);

  const typeOrder = ["asset", "liability", "income", "expense"];

  return (
    <div className="space-y-6">
      {typeOrder.map((type) => {
        if (!accountsByType[type] || accountsByType[type].length === 0) return null;
        
        return (
          <div key={type} className="space-y-1">
            <div className="px-3 py-2 font-bold text-lg text-foreground uppercase">
              {type}
            </div>
            {accountsByType[type].map((account) => (
              <AccountNode
                key={account.id}
                account={account}
                onEdit={onEdit}
                onToggleActive={onToggleActive}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

interface AccountNodeProps {
  account: AccountTree;
  onEdit?: (account: AccountTree) => void;
  onToggleActive?: (account: AccountTree) => void;
}

function AccountNode({ account, onEdit, onToggleActive }: AccountNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = account.children.length > 0;

  // Calculate indentation based on level
  const indentPx = account.level * 24;

  return (
    <div>
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-md
          hover:bg-accent transition-colors
          ${!account.is_active ? "opacity-50" : ""}
        `}
        style={{ paddingLeft: `${indentPx}px` }}
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
              {account.name}
            </span>
            <span className="ml-2 text-xs text-muted-foreground capitalize">
              {account.type}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(account)}
                className="h-7 text-xs"
              >
                Edit
              </Button>
            )}
            {onToggleActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleActive(account)}
                className="h-7 text-xs"
              >
                {account.is_active ? "Disable" : "Enable"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {account.children.map((child) => (
            <AccountNode
              key={child.id}
              account={child}
              onEdit={onEdit}
              onToggleActive={onToggleActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
