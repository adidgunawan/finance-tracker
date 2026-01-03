"use client";

import { useState } from "react";
import { Plus, ArrowDownLeft, ArrowUpRight, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FABProps {
  onAddIncome: () => void;
  onAddExpense: () => void;
  onAddTransfer: () => void;
}

export function FAB({ onAddIncome, onAddExpense, onAddTransfer }: FABProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 z-40 md:hidden">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full shadow-lg transition-transform duration-200",
              open && "rotate-45 bg-destructive hover:bg-destructive/90"
            )}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          side="top" 
          align="end" 
          className="w-48 mb-2 p-2 space-y-1 animate-in slide-in-from-bottom-5 fade-in duration-200"
        >
          <DropdownMenuItem 
            onClick={onAddIncome}
            className="flex items-center gap-2 p-3 cursor-pointer"
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
            <span className="font-medium">Income</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={onAddExpense}
            className="flex items-center gap-2 p-3 cursor-pointer"
          >
            <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
              <ArrowUpRight className="h-4 w-4" />
            </div>
            <span className="font-medium">Expense</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={onAddTransfer}
            className="flex items-center gap-2 p-3 cursor-pointer"
          >
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground">
              <RefreshCw className="h-4 w-4" />
            </div>
            <span className="font-medium">Transfer</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
