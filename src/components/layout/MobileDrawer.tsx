"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Home, 
  FileText, 
  Layers, 
  Wallet, 
  RefreshCcw, 
  BarChart2, 
  Target, 
  Settings, 
  LogOut 
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileDrawer({ open, onOpenChange }: MobileDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get user session
    authClient.getSession().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
      }
    });
  }, []);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      onOpenChange(false);
      router.push("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const handleLinkClick = () => {
    onOpenChange(false);
  };

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Transactions", href: "/transactions", icon: FileText },
    { name: "Accounts", href: "/accounts", icon: Layers },
    { name: "Wallets", href: "/wallets", icon: Wallet },
    { name: "Reconcile", href: "/reconcile", icon: RefreshCcw },
    { name: "Reports", href: "/reports", icon: BarChart2 },
    { name: "Budgets", href: "/budgets", icon: Target },
  ];

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "ME";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[300px] flex flex-col p-0">
        <SheetHeader className="p-4 bg-muted/30 text-left border-b shrink-0">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={user?.image} alt={user?.name || "User"} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
               <SheetTitle className="text-base font-semibold truncate leading-none">
                {user?.name || "My Account"}
               </SheetTitle>
               <SheetDescription className="text-xs truncate text-muted-foreground mt-1">
                {user?.email || ""}
               </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-2 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start h-10",
                    isActive && "bg-secondary text-secondary-foreground"
                  )}
                  asChild
                  onClick={handleLinkClick}
                >
                  <Link href={item.href}>
                    <Icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </Link>
                </Button>
              );
            })}
          </div>
          
          <Separator className="my-4" />
          
          <div className="px-2 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
