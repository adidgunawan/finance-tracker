"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, FileText, Wallet, BarChart2, Plus, ArrowDownLeft, ArrowUpRight, RefreshCw, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileDrawer } from "./MobileDrawer";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Transactions", href: "/transactions", icon: FileText },
  ];

  const navigationRight = [
    { name: "Wallets", href: "/wallets", icon: Wallet },
  ];

  const handleQuickAdd = (type: 'income' | 'expense' | 'transfer') => {
    setQuickAddOpen(false);
    router.push(`/transactions?add=${type}`);
  };

  // Hide on auth pages
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[100] bg-background border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "fill-current/20")} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
          
          {/* Quick Add Button */}
          <DropdownMenu open={quickAddOpen} onOpenChange={setQuickAddOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1",
                  quickAddOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center transition-all",
                  quickAddOpen 
                    ? "bg-primary text-primary-foreground scale-110" 
                    : "bg-primary/10 text-primary"
                )}>
                  <Plus className={cn("h-5 w-5 transition-transform", quickAddOpen && "rotate-45")} />
                </div>
                <span className="text-[10px] font-medium">Quick Add</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              side="top" 
              align="center" 
              className="w-48 mb-2 p-2 space-y-1 animate-in slide-in-from-bottom-5 fade-in duration-200"
            >
              <DropdownMenuItem 
                onClick={() => handleQuickAdd('income')}
                className="flex items-center gap-2 p-3 cursor-pointer"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <ArrowDownLeft className="h-4 w-4" />
                </div>
                <span className="font-medium">Income</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => handleQuickAdd('expense')}
                className="flex items-center gap-2 p-3 cursor-pointer"
              >
                <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <span className="font-medium">Expense</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => handleQuickAdd('transfer')}
                className="flex items-center gap-2 p-3 cursor-pointer"
              >
                <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <span className="font-medium">Transfer</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {navigationRight.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "fill-current/20")} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}

          {/* More Menu Button */}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </div>
      
      <MobileDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
