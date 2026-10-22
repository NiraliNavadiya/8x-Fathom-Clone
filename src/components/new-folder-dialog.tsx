"use client";

import { useState, useTransition } from "react";
import { createFolderAction } from "@/app/actions";
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
import { Input } from "@/components/ui/input";
import type { FolderSummary } from "@/lib/folders";

export function NewFolderDialog({
  open,
  onOpenChange,
  onCreated,
  description = "Group related calls together.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (folder: FolderSummary) => void;
  description?: string;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close(next: boolean) {
    if (!next) {
      setName("");
      setError(null);
    }
    onOpenChange(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createFolderAction(name);
      if (!result.ok) return setError(result.error);
      close(false);
      onCreated?.(result.data);
    });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <label htmlFor="folder-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="folder-name"
              autoFocus
              value={name}
              maxLength={100}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "folder-name-error" : undefined}
              placeholder="e.g. Customer calls"
            />
            {error && (
              <p id="folder-name-error" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "Creating…" : "Create folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
