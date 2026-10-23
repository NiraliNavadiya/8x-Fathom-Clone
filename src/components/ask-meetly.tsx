"use client";

import { Sparkles, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { AskChat, useAskChat } from "@/components/ask-chat";
import { Button } from "@/components/ui/button";
import { useShortcut } from "@/hooks/use-shortcut";

// Drawn from the seeded transcripts, plus two that work for any library.
const SUGGESTIONS = [
  "What are the launch criteria?",
  "What did James say about the rubric?",
  "Who owns payment testing?",
  "Summarize my last call",
  "List all action items",
];

// Not on shared-link pages: viewers there shouldn't search the owner's other calls.
export function AskMeetly() {
  return usePathname().startsWith("/s/") ? null : <AskMeetlyPanel />;
}

function AskMeetlyPanel() {
  const [open, setOpen] = useState(false);
  const chat = useAskChat();
  const reduceMotion = useReducedMotion();
  const trigger = useRef<HTMLButtonElement>(null);

  useShortcut("a", (e) => {
    e.preventDefault();
    setOpen(true);
  });
  useShortcut("Escape", () => close(), open);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  const slide = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" } };

  return (
    <>
      <motion.button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts="a"
        whileHover={reduceMotion ? undefined : { y: -1 }}
        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
        className="fixed right-5 bottom-5 z-40 flex h-10 items-center gap-2 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-lg shadow-black/50 outline-none focus-visible:ring-4 focus-visible:ring-ring/40 sm:right-6 sm:bottom-6"
      >
        <Sparkles className="size-4" aria-hidden />
        <span className="hidden sm:inline">Ask Meetly</span>
        <span className="sr-only sm:hidden">Ask Meetly</span>
        <kbd
          aria-hidden
          className="hidden min-w-5 rounded border border-primary-foreground/30 px-1 text-center font-mono text-[0.6875rem] leading-4 uppercase sm:inline-block"
        >
          a
        </kbd>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="overlay"
              className="fixed inset-0 z-40 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              aria-hidden
            />
            <motion.aside
              key="panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ask-meetly-title"
              {...slide}
              transition={reduceMotion ? { duration: 0.15 } : { type: "spring", damping: 32, stiffness: 320 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l bg-card shadow-2xl sm:w-[26.25rem]"
            >
              <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                <Sparkles className="size-5 text-primary" aria-hidden />
                <h2 id="ask-meetly-title" className="font-semibold">
                  Ask Meetly
                </h2>
                <span className="text-xs text-muted-foreground">across all your calls</span>
                <kbd
                  aria-hidden
                  className="ml-auto hidden rounded border px-1 font-mono text-[0.6875rem] leading-4 text-muted-foreground sm:inline-block"
                >
                  Esc
                </kbd>
                <Button variant="ghost" size="icon-sm" className="sm:ml-0 ml-auto" onClick={close} aria-label="Close Ask Meetly">
                  <X />
                </Button>
              </header>

              <AskChat
                chat={chat}
                suggestions={SUGGESTIONS}
                intro="Meetly searches every transcript and links to the moment."
                citationTarget={{ kind: "link", onNavigate: close }}
                autoFocus
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
