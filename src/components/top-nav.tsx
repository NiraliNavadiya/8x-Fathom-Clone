"use client";

import { AudioLines, Keyboard, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { cn } from "cn";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { Button } from "@/components/ui/button";
import { useShortcut } from "@/hooks/use-shortcut";
import { replaceSearchParam } from "@/lib/search-params";

const links = [
  { href: "/calls", label: "All Calls", shortcut: "c", active: (p: string) => p === "/calls" || p.startsWith("/meetings") },
  { href: "/folders", label: "Folders", shortcut: "f", active: (p: string) => p.startsWith("/folders") },
];

// Pages whose call grid filters on `?q=`.
const searchable = (p: string) => p === "/calls" || /^\/folders\/[^/]+$/.test(p);

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const q = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState(q);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Follow outside changes to ?q= (e.g. "Clear filters"), but not our own
  // trimmed writes, which would eat a trailing space while typing.
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    if (q !== query.trim()) setQuery(q);
  }

  useShortcut("c", () => router.push("/calls"));
  useShortcut("f", () => router.push("/folders"));
  useShortcut("?", () => setShortcutsOpen(true));
  useShortcut("/", (e) => {
    e.preventDefault();
    input.current?.focus();
    input.current?.select();
  });

  function search(value: string) {
    setQuery(value);
    if (searchable(pathname)) replaceSearchParam("q", value.trim() || null);
    else if (value.trim()) router.push(`/calls?q=${encodeURIComponent(value.trim())}`);
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:gap-5">
        <Link href="/calls" aria-label="Meetly, all calls" className="group flex shrink-0 items-center gap-2.5 rounded-lg">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-orange-400 to-primary text-primary-foreground shadow-md shadow-primary/30 transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none">
            <AudioLines className="size-5" strokeWidth={2.5} aria-hidden />
          </span>
          <span className="hidden text-xl font-bold tracking-tight sm:inline">
            Meet<span className="text-primary">ly</span>
          </span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1">
          {links.map((link) => {
            const active = link.active(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                aria-keyshortcuts={link.shortcut}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-base font-medium whitespace-nowrap transition-colors",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {link.label}
                <kbd
                  aria-hidden
                  className={cn(
                    "hidden min-w-5 rounded border px-1 text-center font-mono text-[11px] leading-4 uppercase md:inline-block",
                    active ? "border-primary/40 text-accent-foreground" : "border-border text-muted-foreground",
                  )}
                >
                  {link.shortcut}
                </kbd>
              </Link>
            );
          })}
        </nav>

        <div role="search" className="relative ml-auto w-full max-w-72 min-w-0">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => search(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Escape") return;
              if (query) search("");
              else e.currentTarget.blur();
            }}
            placeholder="Search calls or tags"
            aria-label="Search calls by name or tag"
            aria-keyshortcuts="/"
            className="h-9 w-full rounded-lg border border-input bg-card pr-9 pl-8 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                search("");
                input.current?.focus();
              }}
              className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border px-1.5 font-mono text-[11px] text-muted-foreground sm:block">
              /
            </kbd>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="hidden shrink-0 text-muted-foreground sm:inline-flex"
          onClick={() => setShortcutsOpen(true)}
          aria-label="Keyboard shortcuts"
          aria-keyshortcuts="?"
        >
          <Keyboard aria-hidden />
        </Button>
      </div>
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </header>
  );
}
