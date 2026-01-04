"use client";

import { useState } from "react";
import { format } from "date-fns";
import { 
  ArrowTopRightIcon, 
  ArrowBottomLeftIcon, 
  UpdateIcon, 
  TrashIcon, 
  Pencil1Icon 
} from "@radix-ui/react-icons";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TransactionCardProps {
  transaction: any;
  onClick: (transaction: any) => void;
  onEdit: (transaction: any) => void;
  onDelete: (id: string) => void;
}

export function TransactionCard({ 
  transaction, 
  onClick, 
  onEdit, 
  onDelete 
}: TransactionCardProps) {
  const { format: formatCurrency } = useCurrency();
  const [showActions, setShowActions] = useState(false);

  const isIncome = transaction.type === "income";
  const isExpense = transaction.type === "expense";
  const isTransfer = transaction.type === "transfer";

  const handleCardClick = () => {
    if (showActions) {
      setShowActions(false);
    } else {
      onClick(transaction);
    }
  };

  const handleLongPress = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowActions(!showActions);
  };

  return (
    <div className="border-b last:border-b-0 border-border/50">
      <div 
        className="py-3 px-1 active:bg-accent/30 transition-colors cursor-pointer"
        onClick={handleCardClick}
        onContextMenu={handleLongPress}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
            isIncome && "bg-primary/10 text-primary",
            isExpense && "bg-destructive/10 text-destructive",
            isTransfer && "bg-accent text-accent-foreground"
          )}>
            {isIncome && <ArrowBottomLeftIcon className="w-4 h-4" />}
            {isExpense && <ArrowTopRightIcon className="w-4 h-4" />}
            {isTransfer && <UpdateIcon className="w-4 h-4" />}
          </div>

          {/* Description & Party */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm leading-tight truncate">
              {transaction.description || "No description"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {transaction.payee_payer || (isTransfer ? "Transfer" : "—")}
            </p>
          </div>

          {/* Amount & Date */}
          <div className="text-right shrink-0">
            <p className={cn(
              "font-semibold text-sm leading-tight",
              isIncome ? "text-primary" : "text-foreground"
            )}>
              {isExpense ? "-" : "+"}
              {formatCurrency(transaction.amount, { 
                currency: transaction.currency 
              })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(transaction.transaction_date), "MMM dd")}
            </p>
          </div>
        </div>

        {/* Actions - shown on tap/long press */}
        {showActions && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(transaction);
                setShowActions(false);
              }}
            >
              <Pencil1Icon className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(transaction.id);
                setShowActions(false);
              }}
            >
              <TrashIcon className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
