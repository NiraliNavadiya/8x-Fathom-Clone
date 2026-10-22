"use client";

import { AlertCircle, ArrowUp, PlayCircle, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { WaveLoader } from "@/components/wave-loader";
import { Button } from "@/components/ui/button";
import { useShortcut } from "@/hooks/use-shortcut";
import type { AskResponse, Citation } from "@/lib/ask";
import { formatTimestamp } from "@/lib/format";

// Drawn from the seeded transcripts, plus two that work for any library.
const SUGGESTIONS = [
  "What are the launch criteria?",
  "What did James say about the rubric?",
  "Who owns payment testing?",
  "Summarize my last call",
  "List all action items",
];

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; citations: Citation[] };

export function AskMeetly() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useShortcut("a", (e) => {
    e.preventDefault();
    setOpen(true);
  });
  useShortcut("Escape", () => close(), open);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }, [messages, loading, error, reduceMotion]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  async function send(question: string, history = messages) {
    const content = question.trim();
    if (!content || loading) return;
    const next: Message[] = [...history, { role: "user", content }];
    setMessages(next);
    setDraft("");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // The written answers are the conversation; passages are re-searched each turn.
          messages: next
            .filter((m) => m.content !== null)
            .slice(-20)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Something went wrong. Try again.");
      const { answer, citations } = body as AskResponse;
      setMessages([...next, { role: "assistant", content: answer, citations }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function retry() {
    const last = messages.at(-1);
    if (last?.role === "user") send(last.content, messages.slice(0, -1));
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
        whileHover={reduceMotion ? undefined : { scale: 1.04 }}
        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
        className="fixed right-5 bottom-5 z-40 flex h-12 items-center gap-2 rounded-full bg-primary px-4 font-medium text-primary-foreground shadow-lg shadow-primary/25 outline-none focus-visible:ring-4 focus-visible:ring-ring/40 sm:right-6 sm:bottom-6"
      >
        <Sparkles className="size-5" aria-hidden />
        <span className="hidden sm:inline">Ask Meetly</span>
        <span className="sr-only sm:hidden">Ask Meetly</span>
        <kbd
          aria-hidden
          className="hidden min-w-5 rounded border border-primary-foreground/30 px-1 text-center font-mono text-[11px] leading-4 uppercase sm:inline-block"
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
              onAnimationComplete={() => input.current?.focus()}
              className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l bg-card shadow-2xl sm:w-[420px]"
            >
              <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                <Sparkles className="size-5 text-primary" aria-hidden />
                <h2 id="ask-meetly-title" className="font-semibold">
                  Ask Meetly
                </h2>
                <span className="text-xs text-muted-foreground">across all your calls</span>
                <kbd
                  aria-hidden
                  className="ml-auto hidden rounded border px-1 font-mono text-[11px] leading-4 text-muted-foreground sm:inline-block"
                >
                  Esc
                </kbd>
                <Button variant="ghost" size="icon-sm" className="sm:ml-0 ml-auto" onClick={close} aria-label="Close Ask Meetly">
                  <X />
                </Button>
              </header>

              <div className="flex-1 overflow-y-auto px-4 py-5" aria-live="polite">
                {messages.length === 0 ? (
                  <EmptyState onPick={(q) => send(q)} />
                ) : (
                  <ol className="grid gap-4">
                    {messages.map((m, i) => (
                      <li key={i}>
                        {m.role === "user" ? (
                          <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                            {m.content}
                          </p>
                        ) : (
                          <AssistantMessage message={m} onNavigate={close} />
                        )}
                      </li>
                    ))}
                  </ol>
                )}

                {loading && (
                  <div className="mt-4 flex w-fit items-center gap-2 rounded-2xl rounded-bl-md bg-secondary px-3.5 py-2.5">
                    <WaveLoader size="sm" label="Searching your transcripts" />
                    <span className="text-xs text-muted-foreground">Searching transcripts…</span>
                  </div>
                )}
                {error && (
                  <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                    <p className="flex-1">{error}</p>
                    <Button variant="outline" size="sm" onClick={retry}>
                      Retry
                    </Button>
                  </div>
                )}
                <div ref={bottom} />
              </div>

              <form
                className="shrink-0 border-t p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(draft);
                }}
              >
                <div className="flex items-end gap-2 rounded-xl border border-input bg-background p-1.5 transition-colors focus-within:border-ring">
                  <textarea
                    ref={input}
                    rows={1}
                    value={draft}
                    maxLength={4000}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send(draft);
                      }
                    }}
                    placeholder="Ask about your calls…"
                    aria-label="Ask a question about your calls"
                    className="field-sizing-content max-h-32 min-h-8 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <Button type="submit" size="icon" disabled={loading || !draft.trim()} aria-label="Send">
                    <ArrowUp />
                  </Button>
                </div>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function EmptyState({ onPick }: { onPick: (question: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-4 pt-6 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-accent">
        <Sparkles className="size-6 text-primary" aria-hidden />
      </span>
      <div>
        <p className="font-medium">Ask anything about your calls</p>
        <p className="mt-1 text-sm text-muted-foreground">Meetly searches every transcript and links to the moment.</p>
      </div>
      <ul className="flex w-full flex-col gap-2">
        {SUGGESTIONS.map((q) => (
          <li key={q}>
            <button
              type="button"
              onClick={() => onPick(q)}
              className="w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-accent hover:text-accent-foreground"
            >
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AssistantMessage({
  message,
  onNavigate,
}: {
  message: Extract<Message, { role: "assistant" }>;
  onNavigate: () => void;
}) {
  const { content, citations } = message;
  return (
    <div className="grid max-w-[92%] gap-2">
      <div className="w-fit rounded-2xl rounded-bl-md bg-secondary px-3.5 py-2 text-sm whitespace-pre-wrap">
        {content ??
          (citations.length > 0
            ? "Here's what I found in your transcripts:"
            : "I couldn't find anything about that in your transcripts. Try other words.")}
      </div>

      {/* Without an AI answer, show the matching lines themselves. */}
      {content === null &&
        citations.map((c, i) => (
          <blockquote key={i} className="rounded-xl border bg-background p-3 text-sm">
            <p className="line-clamp-4 text-muted-foreground">
              {c.speaker && <span className="font-medium text-foreground">{c.speaker}: </span>}
              {c.text}
            </p>
            <CitationLink citation={c} onNavigate={onNavigate} className="mt-2" />
          </blockquote>
        ))}
      {content !== null && citations.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Sources">
          {citations.map((c, i) => (
            <li key={i}>
              <CitationLink citation={c} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      )}
      {content === null && citations.length > 0 && (
        <p className="text-xs text-muted-foreground">Written answers turn on once GEMINI_API_KEY is set.</p>
      )}
    </div>
  );
}

function CitationLink({
  citation,
  onNavigate,
  className = "",
}: {
  citation: Citation;
  onNavigate: () => void;
  className?: string;
}) {
  return (
    <Link
      href={`/meetings/${citation.meetingId}?t=${Math.floor(citation.startMs / 1000)}`}
      onClick={onNavigate}
      className={`inline-flex max-w-full items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-accent-foreground transition-colors hover:bg-primary/20 ${className}`}
    >
      <PlayCircle className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{citation.meetingTitle}</span>
      <span className="shrink-0 tabular-nums">· {formatTimestamp(citation.startMs)}</span>
    </Link>
  );
}
