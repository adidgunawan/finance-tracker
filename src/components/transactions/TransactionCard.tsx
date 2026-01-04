"use client";

import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { 
  ArrowTopRightIcon, 
  ArrowBottomLeftIcon, 
  UpdateIcon, 
  TrashIcon, 
  Pencil1Icon 
} from "@radix-ui/react-icons";
import { Paperclip } from "lucide-react";
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

  const isIncome = transaction.type === "income";
  const isExpense = transaction.type === "expense";
  const isTransfer = transaction.type === "transfer";
  const hasAttachments = transaction.transaction_attachments && transaction.transaction_attachments.length > 0;

  return (
    <Card 
      className="p-4 active:scale-[0.98] transition-all duration-200 cursor-pointer hover:bg-accent/50 group touch-manipulation"
      onClick={() => onClick(transaction)}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            isIncome && "bg-primary/10 text-primary",
            isExpense && "bg-destructive/10 text-destructive",
            isTransfer && "bg-accent text-accent-foreground"
          )}>
            {isIncome && <ArrowBottomLeftIcon className="w-5 h-5" />}
            {isExpense && <ArrowTopRightIcon className="w-5 h-5" />}
            {isTransfer && <UpdateIcon className="w-5 h-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium leading-tight break-words">
                {transaction.description || "No description"}
              </h3>
              {hasAttachments && (
                <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {transaction.payee_payer || (isTransfer ? "Transfer" : "-")}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={cn(
            "font-bold text-base",
            isIncome ? "text-primary" : "text-foreground"
          )}>
            {isExpense ? "-" : "+"}
            {formatCurrency(transaction.amount, { 
              currency: transaction.currency 
            })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(transaction.transaction_date), "MMM dd, yyyy")}
          </p>
        </div>
      </div>
      
      {/* Actions row - visible on interaction or always visible on mobile if simplified */}
      <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(transaction);
          }}
        >
          <Pencil1Icon className="w-4 h-4 mr-1" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(transaction.id);
          }}
        >
          <TrashIcon className="w-4 h-4 mr-1" />
          Delete
        </Button>
      </div>
    </Card>
  );
}
