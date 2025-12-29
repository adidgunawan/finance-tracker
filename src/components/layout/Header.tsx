"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Home, FileText, Layers, BarChart, Target } from "lucide-react";
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

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Support both ⌘K and / for opening command dialog
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey)) {
        // Only trigger on "/" if not typing in an input field
        if (e.key === "/") {
          const target = e.target as HTMLElement;
          if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
            return;
          }
        }
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleCommandSelect = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  // Hide header on auth pages
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      <div className="flex h-16 items-center px-4 gap-4">
        <SidebarTrigger />
        <Button
          variant="outline"
          className="h-9 w-64 justify-start text-sm text-muted-foreground border-border bg-background hover:bg-accent"
          onClick={() => setOpen(true)}
        >
          <Search className="mr-2 h-4 w-4" />
          Search
          <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">/</span>
          </kbd>
        </Button>

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
    </header>
  );
}

