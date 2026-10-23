"use client";

import { useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { AnnotationType } from "@/generated/prisma/enums";
import { MARKERS, MarkerShape } from "./markers";

const TYPES: AnnotationType[] = ["HIGHLIGHT", "NOTE", "NEEDS_REVIEW"];

/**
 * Type and note for an annotation, used to create one from a selection and to
 * edit an existing one. On failure it stays open with the draft intact.
 */
export function AnnotationDialog({
  open,
  onOpenChange,
  title,
  quote,
  initialType,
  initialNote = "",
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  quote: string;
  initialType: AnnotationType;
  initialNote?: string;
  onSave: (value: { type: AnnotationType; note: string }) => Promise<string | null>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Remount per opening so the form starts from the current values. */}
        {open && (
          <AnnotationForm
            title={title}
            quote={quote}
            initialType={initialType}
            initialNote={initialNote}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AnnotationForm({
  title,
  quote,
  initialType,
  initialNote,
  onSave,
}: {
  title: string;
  quote: string;
  initialType: AnnotationType;
  initialNote: string;
  onSave: (value: { type: AnnotationType; note: string }) => Promise<string | null>;
}) {
  const [type, setType] = useState(initialType);
  const [note, setNote] = useState(initialNote);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const noteRequired = type === "NOTE";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(await onSave({ type, note: note.trim() }));
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="line-clamp-3 border-l-2 border-primary/50 pl-2 italic">“{quote}”</DialogDescription>
      </DialogHeader>

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Type</legend>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <label
              key={t}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-ring/50",
                type === t ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted",
              )}
            >
              <input type="radio" name="annotation-type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
              <MarkerShape kind={t} />
              {MARKERS[t].label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-1.5">
        <label htmlFor="annotation-note" className="text-sm font-medium">
          Note {!noteRequired && <span className="font-normal text-muted-foreground">(optional)</span>}
        </label>
        <Textarea
          id="annotation-note"
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
          placeholder={type === "NEEDS_REVIEW" ? "What needs checking?" : "Add your note"}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={pending || (noteRequired && !note.trim())}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
