"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, Wallet, BarChart2, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileDrawer } from "./MobileDrawer";
import { useState } from "react";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Transactions", href: "/transactions", icon: FileText },
    { name: "Wallets", href: "/wallets", icon: Wallet },
    { name: "Reports", href: "/reports", icon: BarChart2 },
  ];

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
          
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </div>
      
      <MobileDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
