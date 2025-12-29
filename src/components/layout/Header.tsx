"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { GearIcon, ExitIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { Search, Home, FileText, Layers, BarChart, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const commands = [
  {
    group: "Navigation",
    items: [
      {
        label: "Dashboard",
        icon: Home,
        shortcut: "⌘K D",
        href: "/",
      },
      {
        label: "Transactions",
        icon: FileText,
        shortcut: "⌘K T",
        href: "/transactions",
      },
      {
        label: "Accounts",
        icon: Layers,
        shortcut: "⌘K A",
        href: "/accounts",
      },
      {
        label: "Reports",
        icon: BarChart,
        shortcut: "⌘K R",
        href: "/reports",
      },
      {
        label: "Budgets",
        icon: Target,
        shortcut: "⌘K B",
        href: "/budgets",
      },
    ],
  },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
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

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const handleCommandSelect = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  // Hide header on auth pages
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  // Prevent hydration mismatch by using consistent initial state
  // Only compute user data after mount to ensure SSR/client consistency
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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="flex h-16 items-center px-4">
        <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
          <div className="flex items-center gap-4 flex-1">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-accent"
              >
                <ChevronDownIcon
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isCollapsed ? "rotate-[-90deg]" : "rotate-0"
                  )}
                />
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:hidden">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="h-9 w-64 justify-start text-sm text-muted-foreground border-border bg-background hover:bg-accent"
                  onClick={() => setOpen(true)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search or run command...
                  <CommandShortcut className="ml-auto">⌘K</CommandShortcut>
                </Button>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        <div className="ml-auto flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 h-9 px-3 hover:bg-accent"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold" suppressHydrationWarning>
                  {userInitials}
                </div>
                <span className="text-sm font-medium text-foreground hidden sm:inline-block" suppressHydrationWarning>
                  {displayName}
                </span>
                <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
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

          <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              {commands.map((group) => (
                <CommandGroup key={group.group} heading={group.group}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem
                        key={item.href}
                        onSelect={() => handleCommandSelect(item.href)}
                        className="cursor-pointer"
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                        <CommandShortcut>{item.shortcut}</CommandShortcut>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </CommandDialog>
        </div>
      </div>
    </header>
  );
}

