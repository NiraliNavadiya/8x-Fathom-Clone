"use client";

import { AlertCircle, ArrowUp, PlayCircle, Sparkles } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { WaveLoader } from "@/components/wave-loader";
import { Button } from "@/components/ui/button";
import type { AskResponse, Citation } from "@/lib/ask";
import { formatTimestamp } from "@/lib/format";

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; citations: Citation[]; fallback?: AskResponse["fallback"] };

export type AskChatState = ReturnType<typeof useAskChat>;

/**
 * Conversation state for Ask Meetly. Kept in a hook so the conversation
 * survives the panel closing or the tab switching. It clears on page reload.
 */
export function useAskChat(meetingId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(question: string, history = messages) {
    const content = question.trim();
    if (!content || loading) return;
    const next: Message[] = [...history, { role: "user", content }];
    setMessages(next);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId,
          // The written answers are the conversation; passages are re-searched each turn.
          messages: next
            .filter((m) => m.content !== null)
            .slice(-20)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Something went wrong. Try again.");
      const { answer, citations, fallback } = body as AskResponse;
      setMessages([...next, { role: "assistant", content: answer, citations, fallback }]);
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

  return { messages, loading, error, send, retry };
}

type CitationTarget =
  // Open the meeting at that moment (the global panel).
  | { kind: "link"; onNavigate: () => void }
  // Seek the player on this page (the meeting's Ask tab).
  | { kind: "seek"; onSeek: (citation: Citation) => void };

export function AskChat({
  chat,
  suggestions,
  intro,
  citationTarget,
  autoFocus = false,
}: {
  chat: AskChatState;
  suggestions: string[];
  intro: string;
  citationTarget: CitationTarget;
  autoFocus?: boolean;
}) {
  const { messages, loading, error, send, retry } = chat;
  const [draft, setDraft] = useState("");
  const reduceMotion = useReducedMotion();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0 || loading || error) {
      bottom.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
    }
  }, [messages, loading, error, reduceMotion]);

  function submit(question: string) {
    if (loading || !question.trim()) return;
    setDraft("");
    send(question);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-5" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-4 pt-4 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-accent">
              <Sparkles className="size-6 text-primary" aria-hidden />
            </span>
            <div>
              <p className="font-medium">Ask anything</p>
              <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
            </div>
            <ul className="flex w-full flex-col gap-2">
              {suggestions.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => submit(q)}
                    className="w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors duration-150 hover:border-primary/50 hover:bg-accent hover:text-accent-foreground"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ol className="grid gap-4">
            {messages.map((m, i) => (
              <li key={i}>
                {m.role === "user" ? (
                  <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                    {m.content}
                  </p>
                ) : (
                  <AssistantMessage message={m} target={citationTarget} />
                )}
              </li>
            ))}
          </ol>
        )}

        {loading && (
          <div className="mt-4 flex w-fit items-center gap-2 rounded-2xl rounded-bl-md bg-secondary px-3.5 py-2.5">
            <WaveLoader size="sm" label="Searching transcripts" />
            <span className="text-xs text-muted-foreground">Searching transcripts…</span>
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm"
          >
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
          submit(draft);
        }}
      >
        <div className="flex items-end gap-2 rounded-xl border border-input bg-background p-1.5 transition-colors duration-150 focus-within:border-ring">
          <textarea
            rows={1}
            autoFocus={autoFocus}
            value={draft}
            maxLength={4000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(draft);
              }
            }}
            placeholder="Ask a question…"
            aria-label="Ask a question"
            className="field-sizing-content max-h-32 min-h-8 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="icon" disabled={loading || !draft.trim()} aria-label="Send">
            <ArrowUp />
          </Button>
        </div>
      </form>
    </div>
  );
}

function AssistantMessage({
  message,
  target,
}: {
  message: Extract<Message, { role: "assistant" }>;
  target: CitationTarget;
}) {
  const { content, citations, fallback } = message;
  return (
    <div className="grid max-w-[92%] gap-2">
      <div className="w-fit rounded-2xl rounded-bl-md bg-secondary px-3.5 py-2 text-sm whitespace-pre-wrap">
        {content ??
          (citations.length > 0
            ? "Here's what I found in the transcripts:"
            : "I couldn't find anything about that in the transcripts. Try other words.")}
      </div>

      {/* Without an AI answer, show the matching lines themselves. */}
      {content === null &&
        citations.map((c, i) => (
          <blockquote key={i} className="rounded-xl border bg-background p-3 text-sm">
            <p className="line-clamp-4 text-muted-foreground">
              {c.speaker && <span className="font-medium text-foreground">{c.speaker}: </span>}
              {c.text}
            </p>
            <CitationChip citation={c} target={target} className="mt-2" />
          </blockquote>
        ))}
      {content !== null && citations.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Sources">
          {citations.map((c, i) => (
            <li key={i}>
              <CitationChip citation={c} target={target} />
            </li>
          ))}
        </ul>
      )}
      {content === null && citations.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {fallback === "ai-unavailable"
            ? "The AI couldn't answer right now, so these are the matching transcript lines. Try again in a moment."
            : "Written answers turn on once GEMINI_API_KEY is set."}
        </p>
      )}
    </div>
  );
}

const chipClass =
  "inline-flex max-w-full items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-accent-foreground transition-colors duration-150 hover:bg-primary/20";

function CitationChip({ citation, target, className = "" }: { citation: Citation; target: CitationTarget; className?: string }) {
  const time = formatTimestamp(citation.startMs);
  if (target.kind === "seek") {
    return (
      <button
        type="button"
        onClick={() => target.onSeek(citation)}
        className={`${chipClass} ${className}`}
        aria-label={`Play from ${time}`}
      >
        <PlayCircle className="size-3.5 shrink-0" aria-hidden />
        <span className="tabular-nums">{time}</span>
        {citation.speaker && <span className="truncate">· {citation.speaker}</span>}
      </button>
    );
  }
  return (
    <Link
      href={`/meetings/${citation.meetingId}?t=${Math.floor(citation.startMs / 1000)}`}
      onClick={target.onNavigate}
      className={`${chipClass} ${className}`}
    >
      <PlayCircle className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{citation.meetingTitle}</span>
      <span className="shrink-0 tabular-nums">· {time}</span>
    </Link>
  );
}
