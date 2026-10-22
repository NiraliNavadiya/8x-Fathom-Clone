"use client";

import { SearchX, Video } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { MeetingTile } from "@/components/meeting-tile";
import { Button } from "@/components/ui/button";
import { useShortcut } from "@/hooks/use-shortcut";
import type { FolderSummary } from "@/lib/folders";
import type { MeetingSummary } from "@/lib/meetings";
import { replaceSearchParam } from "@/lib/search-params";

function matches(meeting: MeetingSummary, query: string) {
  const q = query.toLowerCase();
  return meeting.title.toLowerCase().includes(q) || meeting.tags.some((t) => t.name.toLowerCase().includes(q));
}

export function CallsGrid({
  meetings,
  folders,
  empty,
}: {
  meetings: MeetingSummary[];
  folders: FolderSummary[];
  /** Shown when there are no calls at all (not when a search finds none). */
  empty: React.ReactNode;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const activeTag = params.get("tag");
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  // Keyboard selection (j/k) is a position in the filtered list, so it resets
  // when the filters change.
  const filterKey = `${query}
${activeTag}`;
  const [selection, setSelection] = useState({ key: filterKey, index: -1 });
  const grid = useRef<HTMLUListElement>(null);

  const visible = useMemo(() => meetings.filter((m) => !deleted.has(m.id)), [meetings, deleted]);
  const tags = useMemo(() => {
    const byName = new Map(visible.flatMap((m) => m.tags).map((t) => [t.name, t]));
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [visible]);
  const shown = visible.filter(
    (m) => (!query || matches(m, query)) && (!activeTag || m.tags.some((t) => t.name === activeTag)),
  );

  const selected = selection.key === filterKey && selection.index < shown.length ? selection.index : -1;

  function select(index: number) {
    if (shown.length === 0) return;
    const next = Math.max(0, Math.min(shown.length - 1, index));
    setSelection({ key: filterKey, index: next });
    grid.current?.children[next]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  useShortcut("j", () => select(selected + 1));
  useShortcut("k", () => select(selected < 0 ? 0 : selected - 1));
  useShortcut("Enter", (e) => {
    // Enter on a focused link or button keeps its normal behaviour.
    if (e.target !== document.body) return;
    const meeting = shown[selected];
    if (meeting) router.push(`/meetings/${meeting.id}`);
  });

  if (visible.length === 0) return <>{empty}</>;

  return (
    <div className="grid gap-5">
      {tags.length > 0 && (
        <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-2">
          <TagChip active={!activeTag} onClick={() => replaceSearchParam("tag", null)}>
            All
          </TagChip>
          {tags.map((tag) => (
            <TagChip
              key={tag.id}
              active={activeTag === tag.name}
              onClick={() => replaceSearchParam("tag", activeTag === tag.name ? null : tag.name)}
            >
              {tag.name}
            </TagChip>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <SearchX className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground">
            No calls match{" "}
            <span className="text-foreground">
              {[query && `“${query}”`, activeTag && `the ${activeTag} tag`].filter(Boolean).join(" and ")}
            </span>
          </p>
          <Button
            variant="outline"
            onClick={() => {
              replaceSearchParam("q", null);
              replaceSearchParam("tag", null);
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <p className="sr-only" aria-live="polite">
            {shown.length} {shown.length === 1 ? "call" : "calls"}
          </p>
          <ul ref={grid} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((meeting, i) => (
              <li key={meeting.id} className="flex">
                <div className="flex w-full flex-col [&>article]:flex-1">
                  <MeetingTile
                    meeting={meeting}
                    folders={folders}
                    selected={i === selected}
                    onDeleted={(id) => setDeleted((prev) => new Set(prev).add(id))}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function TagChip({ active, ...props }: React.ComponentProps<"button"> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
      {...props}
    />
  );
}

export function NoCalls({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <Video className="size-8 text-muted-foreground" aria-hidden />
      <div className="max-w-sm text-muted-foreground">{children}</div>
    </div>
  );
}
