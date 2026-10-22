"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const shortcuts = [
  ["c", "All Calls"],
  ["f", "Folders"],
  ["/", "Search"],
  ["a", "Ask Meetly"],
  ["j / k", "Move between calls"],
  ["Enter", "Open the selected call"],
  ["?", "Show shortcuts"],
  ["Esc", "Close panels"],
] as const;

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Shortcuts are off while you type in a field.</DialogDescription>
        </DialogHeader>
        <dl className="divide-y divide-border">
          {shortcuts.map(([keys, action]) => (
            <div key={keys} className="flex items-center justify-between py-2">
              <dt className="text-muted-foreground">{action}</dt>
              <dd>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{keys}</kbd>
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
