"use client";

import { Highlighter, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteAnnotationAction, updateAnnotationAction } from "@/app/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { AnnotationView } from "@/lib/meetings";
import { AnnotationDialog } from "./annotation-dialog";
import { MARKERS, MarkerShape } from "./markers";
import { usePlayer } from "./player-context";

/**
 * Two sections: Highlights (saved excerpts) and Annotations (excerpts with a
 * note, including Needs review). Clicking an item plays from it.
 */
export function Annotations({
  annotations,
  onUpdated,
  onDeleted,
}: {
  annotations: AnnotationView[];
  onUpdated: (annotation: AnnotationView) => void;
  onDeleted: (id: string) => void;
}) {
  const highlights = annotations.filter((a) => a.type === "HIGHLIGHT");
  const notes = annotations.filter((a) => a.type !== "HIGHLIGHT");
  return (
    <>
      <AnnotationSection
        id="highlights"
        title="Highlights"
        empty="Select text in the transcript and choose Highlight to save an excerpt."
        items={highlights}
        onUpdated={onUpdated}
        onDeleted={onDeleted}
      />
      <AnnotationSection
        id="annotations"
        title="Annotations"
        empty="Select text in the transcript and choose Annotation to add a note."
        items={notes}
        onUpdated={onUpdated}
        onDeleted={onDeleted}
      />
    </>
  );
}

function AnnotationSection({
  id,
  title,
  empty,
  items: annotations,
  onUpdated,
  onDeleted,
}: {
  id: string;
  title: string;
  empty: string;
  items: AnnotationView[];
  onUpdated: (annotation: AnnotationView) => void;
  onDeleted: (id: string) => void;
}) {
  const { seek } = usePlayer();
  const [editing, setEditing] = useState<AnnotationView | null>(null);
  const [deleting, setDeleting] = useState<AnnotationView | null>(null);
  const sorted = [...annotations].sort((a, b) => a.startMs - b.startMs);
  const reviewCount = annotations.filter((a) => a.type === "NEEDS_REVIEW").length;

  return (
    <section aria-labelledby={`${id}-heading`} className="rounded-xl border bg-card">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3  rounded-t-xl bg-border">
        <h2 id={`${id}-heading`} className="font-semibold">
          {title}
        </h2>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {reviewCount > 0 && (
            <span className="rounded-full bg-red-400/15 px-2 py-0.5 font-medium text-red-300">{reviewCount} to review</span>
          )}
          {annotations.length > 0 && annotations.length}
        </span>
      </header>

      {sorted.length === 0 ? (
        <div className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <Highlighter className="size-5 shrink-0" aria-hidden />
          {empty}
        </div>
      ) : (
        <ul className="divide-y">
          {sorted.map((a) => (
            <li
              key={a.id}
              className="relative flex items-start gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/40"
            >
              <MarkerShape kind={a.type} className="mt-1.5" />
              {/* The whole row plays from the annotation; the menu sits above it. */}
              <button
                type="button"
                onClick={() => seek(a.startMs)}
                className="min-w-0 flex-1 text-left after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset"
              >
                <span className="sr-only">{MARKERS[a.type].label}: </span>
                {a.type === "NEEDS_REVIEW" && (
                  <span
                    aria-hidden
                    className="mb-1 inline-block rounded-full bg-red-400/15 px-2 py-0.5 text-[0.6875rem] font-medium text-red-300"
                  >
                    Needs review
                  </span>
                )}
                <span className="line-clamp-3 block text-sm leading-relaxed">“{a.quote}”</span>
                {a.note && <span className="mt-1 block text-sm text-muted-foreground">{a.note}</span>}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="relative z-10 -my-1 text-muted-foreground"
                      aria-label={`Options for “${a.quote.slice(0, 40)}”`}
                    />
                  }
                >
                  <MoreVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => setEditing(a)}>
                    <Pencil /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleting(a)}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <AnnotationDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit annotation"
        quote={editing?.quote ?? ""}
        initialType={editing?.type ?? "HIGHLIGHT"}
        initialNote={editing?.note ?? ""}
        onSave={async ({ type, note }) => {
          if (!editing) return null;
          const result = await updateAnnotationAction(editing.id, { type, note: note || null });
          if (!result.ok) return result.error;
          onUpdated(result.data);
          setEditing(null);
          toast.success("Annotation saved");
          return null;
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this annotation?"
        description={
          deleting ? `“${deleting.quote.slice(0, 120)}${deleting.quote.length > 120 ? "…" : ""}” will be removed.` : ""
        }
        onConfirm={async () => {
          if (!deleting) return null;
          const result = await deleteAnnotationAction(deleting.id);
          if (!result.ok) return result.error;
          onDeleted(deleting.id);
          toast.success("Annotation deleted");
          return null;
        }}
      />
    </section>
  );
}
