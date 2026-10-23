"use client";

import { AudioLines, Keyboard } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "cn";
import { CALL_SEARCH_ID } from "@/components/calls-grid";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { Button } from "@/components/ui/button";
import { useShortcut } from "@/hooks/use-shortcut";

const links = [
  { href: "/calls", label: "All Calls", shortcut: "c", active: (p: string) => p === "/calls" || p.startsWith("/meetings") },
  { href: "/folders", label: "Folders", shortcut: "f", active: (p: string) => p.startsWith("/folders") },
];

// Shared-link pages (/s/...) show only the meeting, without app navigation.
export function TopNav() {
  return usePathname().startsWith("/s/") ? null : <AppNav />;
}

function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useShortcut("c", () => router.push("/calls"));
  useShortcut("f", () => router.push("/folders"));
  useShortcut("?", () => setShortcutsOpen(true));
  // "/" focuses the call search on pages that have one; elsewhere it opens All Calls.
  useShortcut("/", (e) => {
    if (document.getElementById(CALL_SEARCH_ID)) return;
    e.preventDefault();
    router.push("/calls");
  });

  return (
    <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
      <div className="page-container flex h-14 items-center gap-2 sm:gap-4">
        <nav aria-label="Main" className="-ml-3 flex items-center gap-1">
          {links.map((link) => {
            const active = link.active(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                aria-keyshortcuts={link.shortcut}
                className={cn(
                  "text-lg relative flex items-center gap-2 rounded-md px-3 py-1.5 font-medium whitespace-nowrap transition-colors",
                  // Active: neutral pill plus an orange bar on the navbar's bottom edge.
                  active
                    ? "font-normal after:absolute after:inset-x-3 after:-bottom-3 after:h-0.5 after:rounded-full after:bg-primary"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {link.label}
                <kbd
                  aria-hidden
                  className={cn(
                    "hidden min-w-5 rounded border px-1 text-center font-mono text-[0.6875rem] leading-4 uppercase md:inline-block",
                    "border-border text-muted-foreground",
                  )}
                >
                  {link.shortcut}
                </kbd>
              </Link>
            );
          })}
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto hidden shrink-0 text-muted-foreground sm:inline-flex"
          onClick={() => setShortcutsOpen(true)}
          aria-label="Keyboard shortcuts"
          aria-keyshortcuts="?"
        >
          <Keyboard aria-hidden />
        </Button>
        <Link href="/calls" aria-label="Meetly, all calls" className="group ml-auto flex shrink-0 items-center gap-2.5 rounded-lg sm:ml-0">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <AudioLines className="size-4.5" strokeWidth={2.5} aria-hidden />
          </span>
          <span className="hidden text-lg font-semibold tracking-tight sm:inline">
            Meetly
          </span>
        </Link>

      </div>
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </header>
  );
}
