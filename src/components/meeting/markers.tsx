import { cn } from "cn";
import type { AnnotationType } from "@/generated/prisma/enums";

export type MarkerKind = AnnotationType | "ACTION_ITEM";

// Each kind differs in shape as well as colour, so they're distinguishable
// without relying on colour alone.
export const MARKERS: Record<MarkerKind, { label: string; shape: string; mark: string }> = {
  HIGHLIGHT: { label: "Highlight", shape: "rounded-full bg-yellow-400", mark: "bg-yellow-400/25" },
  NOTE: { label: "Note", shape: "rounded-[2px] bg-sky-400", mark: "bg-sky-400/25" },
  NEEDS_REVIEW: { label: "Needs review", shape: "rotate-45 rounded-[1px] bg-red-400", mark: "bg-red-400/25" },
  ACTION_ITEM: { label: "Action item", shape: "rounded-full border-2 border-primary bg-background", mark: "" },
};

export function MarkerShape({ kind, className }: { kind: MarkerKind; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0", MARKERS[kind].shape, className)} />;
}
