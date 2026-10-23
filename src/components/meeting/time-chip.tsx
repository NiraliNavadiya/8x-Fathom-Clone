"use client";

import { Play } from "lucide-react";
import { cn } from "cn";
import { formatTimestamp } from "@/lib/format";
import { usePlayer } from "./player-context";

/** A timestamp that plays the video from that moment. */
export function TimeChip({ ms, className }: { ms: number; className?: string }) {
  const { seek } = usePlayer();
  const time = formatTimestamp(ms);
  return (
    <button
      type="button"
      onClick={() => seek(ms)}
      aria-label={`Play from ${time}`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-xs text-accent-foreground tabular-nums transition-colors duration-150 hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <Play className="size-2.5 fill-current" aria-hidden />
      {time}
    </button>
  );
}

/** Icon-only version for lists that don't show times; the time is still announced. */
export function PlayMomentButton({ ms, className }: { ms: number; className?: string }) {
  const { seek } = usePlayer();
  return (
    <button
      type="button"
      onClick={() => seek(ms)}
      aria-label={`Play from ${formatTimestamp(ms)}`}
      title={`Play from ${formatTimestamp(ms)}`}
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-primary/15 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <Play className="size-3.5 fill-current" aria-hidden />
    </button>
  );
}
