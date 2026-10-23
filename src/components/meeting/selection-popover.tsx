"use client";

import { Highlighter, Loader2, MessageSquarePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { AnnotationType } from "@/generated/prisma/enums";

/**
 * Appears over selected transcript text. "Highlight" saves the excerpt at
 * once; "Annotation" opens a note field in place. Errors show inline and keep
 * the draft.
 */
export function SelectionPopover({
  rect,
  onSave,
  onClose,
  onNoteModeChange,
}: {
  rect: DOMRect;
  /** Resolves to an error message, or null once saved. */
  onSave: (type: AnnotationType, note?: string) => Promise<string | null>;
  onClose: () => void;
  /** While writing a note the popover stays put when the transcript scrolls. */
  onNoteModeChange: (writing: boolean) => void;
}) {
  const [mode, setMode] = useState<"menu" | "note">("menu");
  const [note, setNote] = useState("");
  const [needsReview, setNeedsReview] = useState(false);
  const [saving, setSaving] = useState<AnnotationType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node) && !saving) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, saving]);

  async function save(type: AnnotationType, text?: string) {
    setSaving(type);
    setError(null);
    const message = await onSave(type, text);
    setSaving(null);
    if (message) setError(message);
  }

  function openNote() {
    setMode("note");
    onNoteModeChange(true);
  }

  // Above the selection when there's room, otherwise below it.
  const width = mode === "note" ? 320 : 248;
  const above = rect.top > (mode === "note" ? 260 : 120);
  const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, 8), window.innerWidth - width - 8);
  const style = above ? { left, bottom: window.innerHeight - rect.top + 8, width } : { left, top: rect.bottom + 8, width };

  return (
    <div
      ref={box}
      role="dialog"
      aria-label="Save selected text"
      style={style}
      // Keep the text selected while pressing the menu buttons.
      onMouseDown={(e) => mode === "menu" && e.preventDefault()}
      className="fixed z-50 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl shadow-black/50 animate-in fade-in-0 zoom-in-95 duration-150 motion-reduce:animate-none"
    >
      {mode === "menu" ? (
        <div className="flex gap-1">
          <MenuButton onClick={() => save("HIGHLIGHT")} disabled={saving !== null} busy={saving === "HIGHLIGHT"} icon={Highlighter}>
            Highlight
          </MenuButton>
          <MenuButton onClick={openNote} disabled={saving !== null} icon={MessageSquarePlus}>
            Annotation
          </MenuButton>
        </div>
      ) : (
        <form
          className="grid gap-2 p-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            save(needsReview ? "NEEDS_REVIEW" : "NOTE", note.trim());
          }}
        >
          <label htmlFor="selection-note" className="text-xs font-medium text-muted-foreground">
            Your note
          </label>
          <Textarea
            id="selection-note"
            autoFocus
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "selection-note-error" : undefined}
            placeholder="What stands out here?"
            className="min-h-20 text-sm"
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={needsReview} onCheckedChange={setNeedsReview} />
            Mark as needs review
          </label>
          <div className="flex justify-end gap-1.5">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving !== null}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving !== null || !note.trim()}>
              {saving ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden /> Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </form>
      )}
      {error && (
        <p id="selection-note-error" role="alert" className="px-2 pt-1 pb-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function MenuButton({
  icon: Icon,
  busy = false,
  children,
  ...props
}: React.ComponentProps<"button"> & { icon: React.ComponentType<{ className?: string }>; busy?: boolean }) {
  return (
    <button
      type="button"
      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
      {...props}
    >
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Icon className="size-4" />}
      {busy ? "Saving…" : children}
    </button>
  );
}
