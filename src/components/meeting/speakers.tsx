import { cn } from "cn";
import { initials } from "@/lib/format";

// Distinct, readable-on-dark colours per speaker, in speaker order. Orange is
// left out so speakers don't look like actions.
const PALETTE = [
  { text: "text-sky-300", bg: "bg-sky-400/15", ring: "ring-sky-400/40" },
  { text: "text-violet-300", bg: "bg-violet-400/15", ring: "ring-violet-400/40" },
  { text: "text-emerald-300", bg: "bg-emerald-400/15", ring: "ring-emerald-400/40" },
  { text: "text-rose-300", bg: "bg-rose-400/15", ring: "ring-rose-400/40" },
  { text: "text-amber-200", bg: "bg-amber-300/15", ring: "ring-amber-300/40" },
  { text: "text-teal-300", bg: "bg-teal-400/15", ring: "ring-teal-400/40" },
  { text: "text-fuchsia-300", bg: "bg-fuchsia-400/15", ring: "ring-fuchsia-400/40" },
  { text: "text-lime-300", bg: "bg-lime-400/15", ring: "ring-lime-400/40" },
];

export type SpeakerColor = (typeof PALETTE)[number];

export function speakerColors(names: string[]): Map<string, SpeakerColor> {
  return new Map(names.map((name, i) => [name, PALETTE[i % PALETTE.length]]));
}

export const UNKNOWN_SPEAKER: SpeakerColor = { text: "text-muted-foreground", bg: "bg-muted", ring: "ring-border" };

export function SpeakerAvatar({ name, color, className }: { name: string; color: SpeakerColor; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ring-1",
        color.bg,
        color.text,
        color.ring,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
