"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  FileTextIcon,
  LayersIcon,
  BarChartIcon,
  TargetIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: HomeIcon },
  { name: "Transactions", href: "/transactions", icon: FileTextIcon },
  { name: "Accounts", href: "/accounts", icon: LayersIcon },
  { name: "Reports", href: "/reports", icon: BarChartIcon },
  { name: "Budgets", href: "/budgets", icon: TargetIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  // Hide sidebar on auth pages
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  return (
    <div className="w-64 border-r bg-card h-screen sticky top-0 flex flex-col z-50">
      <div className="p-6">
        <h1 className="text-xl font-bold text-foreground">
          Finance Tracker
        </h1>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 font-semibold">
          Personal Finance
        </p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors group",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-accent-foreground")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
