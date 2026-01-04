"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, FileText, Target, Plus, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileDrawer } from "./MobileDrawer";
import { useState } from "react";

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Transactions", href: "/transactions", icon: FileText },
  ];

  const navigationRight = [
    { name: "Budgets", href: "/budgets", icon: Target },
  ];

  const handleQuickAdd = () => {
    router.push(`/transactions?add=expense`);
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
                prefetch={true}
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
          <button
            onClick={handleQuickAdd}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground hover:text-foreground"
          >
            <div className="h-10 w-10 rounded-full flex items-center justify-center transition-all bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground hover:scale-110">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-medium">Quick Add</span>
          </button>

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
