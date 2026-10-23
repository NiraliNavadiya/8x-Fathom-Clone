"use client";

import { ListTodo, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { deleteActionItemAction, updateActionItemAction } from "@/app/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActionItemView } from "@/lib/meetings";
import { SpeakerAvatar, UNKNOWN_SPEAKER, type SpeakerColor } from "./speakers";
import { PlayMomentButton } from "./time-chip";

type Speaker = { id: string; name: string };
const UNASSIGNED = "unassigned";
const ALL = "all";

/**
 * Action items in one card, grouped by assignee. Everything shows by default;
 * the person filter narrows it. Changes save straight to the database and
 * the list updates once they succeed (checking a box updates instantly and
 * rolls back if saving fails).
 */
export function ActionItems({
  items,
  speakers,
  colors,
  onChanged,
  onDeleted,
}: {
  items: ActionItemView[];
  speakers: Speaker[];
  colors: Map<string, SpeakerColor>;
  onChanged: (item: ActionItemView) => void;
  onDeleted: (id: string) => void;
}) {
  const [filter, setFilter] = useState(ALL);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ActionItemView | null>(null);

  async function toggle(item: ActionItemView, completed: boolean) {
    onChanged({ ...item, completed });
    const result = await updateActionItemAction(item.id, { completed });
    if (!result.ok) {
      onChanged(item);
      toast.error(result.error);
    }
  }

  const groups = new Map<string, { key: string; name: string | null; items: ActionItemView[] }>();
  for (const item of [...items].sort((a, b) => a.position - b.position)) {
    const key = item.assignee?.id ?? UNASSIGNED;
    const group = groups.get(key) ?? { key, name: item.assignee?.name ?? null, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  const ordered = [...groups.values()].sort((a, b) =>
    a.name === null ? 1 : b.name === null ? -1 : a.name.localeCompare(b.name),
  );
  // A filter whose person no longer has items falls back to everyone.
  const activeFilter = filter === ALL || groups.has(filter) ? filter : ALL;
  const shown = activeFilter === ALL ? ordered : ordered.filter((g) => g.key === activeFilter);
  const done = items.filter((i) => i.completed).length;

  return (
    <section aria-labelledby="action-items-heading" className="rounded-xl border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-3 rounded-t-xl bg-border">
        <h2 id="action-items-heading" className="font-semibold">
          Action items
        </h2>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {done}/{items.length} done
          </span>
        )}
      </header>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <ListTodo className="size-5 shrink-0" aria-hidden />
          No action items for this meeting.
        </div>
      ) : (
        <>
          {ordered.length > 1 && (
            <div role="group" aria-label="Filter by person" className="flex flex-wrap gap-1.5 px-4 py-3.5">
              <FilterChip active={activeFilter === ALL} onClick={() => setFilter(ALL)}>
                Everyone · {items.length}
              </FilterChip>
              {ordered.map((g) => (
                <FilterChip key={g.key} active={activeFilter === g.key} onClick={() => setFilter(g.key)}>
                  {g.name ?? "Unassigned"} · {g.items.length}
                </FilterChip>
              ))}
            </div>
          )}
          <div>
            {shown.map((group) => (
              <div key={group.key} className="grid gap-1 px-4">
                <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  {/*<SpeakerAvatar
                    name={group.name ?? "?"}
                    color={group.name ? (colors.get(group.name) ?? UNKNOWN_SPEAKER) : UNKNOWN_SPEAKER}
                    className="size-6 text-[10px]"
                  />*/}
                  {group.name ?? "Unassigned"}
                </p>
                <ul className="grid gap-1">
                  {group.items.map((item) =>
                    editingId === item.id ? (
                      <EditRow
                        key={item.id}
                        item={item}
                        speakers={speakers}
                        onDone={(updated) => {
                          if (updated) onChanged(updated);
                          setEditingId(null);
                        }}
                      />
                    ) : (
                      <ItemRow
                        key={item.id}
                        item={item}
                        onToggle={(completed) => toggle(item, completed)}
                        onEdit={() => setEditingId(item.id)}
                        onDelete={() => setDeleting(item)}
                      />
                    ),
                  )}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this action item?"
        description={deleting ? `“${deleting.description}” will be removed.` : ""}
        onConfirm={async () => {
          if (!deleting) return null;
          const result = await deleteActionItemAction(deleting.id);
          if (!result.ok) return result.error;
          onDeleted(deleting.id);
          toast.success("Action item deleted");
          return null;
        }}
      />
    </section>
  );
}

function FilterChip({ active, ...props }: React.ComponentProps<"button"> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
      {...props}
    />
  );
}

function ItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: ActionItemView;
  onToggle: (completed: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const inputId = `action-${item.id}`;
  return (
    <li className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-muted/50">
      <Checkbox id={inputId} checked={item.completed} onCheckedChange={onToggle} className="mt-0.5" />
      <label
        htmlFor={inputId}
        className={cn(
          "flex-1 cursor-pointer text-sm leading-relaxed line-through decoration-transparent transition-[color,text-decoration-color] duration-200 motion-reduce:transition-none",
          item.completed && "text-muted-foreground decoration-muted-foreground",
        )}
      >
        {item.description}
        {item.dueDate && <span className="ml-2 text-xs text-muted-foreground no-underline">Due {item.dueDate}</span>}
      </label>
      {item.timestampMs !== null && <PlayMomentButton ms={item.timestampMs} className="-my-1" />}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="-my-1 text-muted-foreground"
              aria-label={`Options for “${item.description}”`}
            />
          }
        >
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function EditRow({
  item,
  speakers,
  onDone,
}: {
  item: ActionItemView;
  speakers: Speaker[];
  onDone: (updated: ActionItemView | null) => void;
}) {
  const [description, setDescription] = useState(item.description);
  const [assignee, setAssignee] = useState(item.assignee?.id ?? UNASSIGNED);
  const [dueDate, setDueDate] = useState(item.dueDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const prefix = `edit-${item.id}`;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await updateActionItemAction(item.id, {
      description,
      assigneeId: assignee === UNASSIGNED ? null : assignee,
      dueDate: dueDate || null,
    });
    setPending(false);
    // On failure the form stays open with the draft so nothing is lost.
    if (!result.ok) return setError(result.error);
    toast.success("Action item saved");
    onDone(result.data);
  }

  return (
    <li className="-mx-2 rounded-lg border border-primary/40 bg-background/60 p-3">
      <form onSubmit={save} className="grid gap-3" onKeyDown={(e) => e.key === "Escape" && onDone(null)}>
        <div className="grid gap-1">
          <label htmlFor={`${prefix}-description`} className="text-xs font-medium text-muted-foreground">
            Task
          </label>
          <Input
            id={`${prefix}-description`}
            autoFocus
            value={description}
            maxLength={1000}
            onChange={(e) => {
              setDescription(e.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <label htmlFor={`${prefix}-assignee`} className="text-xs font-medium text-muted-foreground">
              Assignee
            </label>
            <Select
              value={assignee}
              onValueChange={(v) => v && setAssignee(v)}
              items={[{ value: UNASSIGNED, label: "Unassigned" }, ...speakers.map((s) => ({ value: s.id, label: s.name }))]}
            >
              <SelectTrigger id={`${prefix}-assignee`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {speakers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <label htmlFor={`${prefix}-due`} className="text-xs font-medium text-muted-foreground">
              Due date <span className="font-normal">(optional)</span>
            </label>
            <Input
              id={`${prefix}-due`}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="[color-scheme:dark]"
            />
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending || !description.trim()}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onDone(null)} disabled={pending}>
            Cancel
          </Button>
        </div>
      </form>
    </li>
  );
}
