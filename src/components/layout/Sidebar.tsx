"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HomeIcon,
  FileTextIcon,
  LayersIcon,
  BarChartIcon,
  TargetIcon,
} from "@radix-ui/react-icons";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { GearIcon, ExitIcon, ChevronDownIcon } from "@radix-ui/react-icons";

const navigation = [
  { name: "Dashboard", href: "/", icon: HomeIcon },
  { name: "Transactions", href: "/transactions", icon: FileTextIcon },
  { name: "Accounts", href: "/accounts", icon: LayersIcon },
  { name: "Reports", href: "/reports", icon: BarChartIcon },
  { name: "Budgets", href: "/budgets", icon: TargetIcon },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
      router.push("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  // Hide sidebar on auth pages
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  // Prevent hydration mismatch by using consistent initial state
  const userInitials = !mounted ? "ME" : (user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "ME");

  const displayName = !mounted ? "My Account" : (user?.name ? user.name : "My Account");
  const displayEmail = !mounted ? "" : (user?.email ? user.email : "");
  const userImage = !mounted ? null : (user?.image || null);

  return (
    <Sidebar variant="floating">
      <SidebarHeader>
        <div className="p-6">
          <h1 className="text-xl font-bold text-sidebar-foreground">
            Finance Tracker
          </h1>
          <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60 mt-1 font-semibold">
            Personal Finance
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-auto py-2 px-2 hover:bg-sidebar-accent"
            >
              {userImage ? (
                <img
                  src={userImage}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  suppressHydrationWarning
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold flex-shrink-0" suppressHydrationWarning>
                  {userInitials}
                </div>
              )}
              <div className="flex flex-col items-start flex-1 min-w-0" suppressHydrationWarning>
                <span className="text-sm font-medium text-sidebar-foreground truncate w-full" suppressHydrationWarning>
                  {displayName}
                </span>
                <span className="text-xs text-sidebar-foreground/60 truncate w-full" suppressHydrationWarning>
                  {displayEmail}
                </span>
              </div>
              <ChevronDownIcon className="h-4 w-4 text-sidebar-foreground/60 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-foreground" suppressHydrationWarning>
                  {displayName}
                </p>
                <p className="text-xs leading-none text-muted-foreground" suppressHydrationWarning>
                  {displayEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="cursor-pointer"
            >
              <GearIcon className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <ExitIcon className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
