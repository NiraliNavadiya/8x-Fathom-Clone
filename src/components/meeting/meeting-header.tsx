"use client";

import { Calendar, Check, ChevronDown, Clock, Folder, FolderPlus, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateDescriptionAction } from "@/app/actions";
import { useFolderMenu } from "@/components/folder-menu";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { FolderSummary } from "@/lib/folders";
import type { ShareInfo } from "@/lib/shares";
import { formatMeetingDate, formatTimestamp } from "@/lib/format";
import type { MeetingWorkspace } from "@/lib/meetings";
import { ShareButton } from "./share-dialog";
import { SpeakerAvatar, UNKNOWN_SPEAKER, type SpeakerColor } from "./speakers";

export function MeetingHeader({
  meeting,
  folders,
  share,
  colors,
  readOnly = false,
}: {
  meeting: MeetingWorkspace;
  folders: FolderSummary[];
  share: ShareInfo | null;
  colors: Map<string, SpeakerColor>;
  /** Share-link view: no sharing, description editing or folder controls. */
  readOnly?: boolean;
}) {
  const folderMenu = useFolderMenu(meeting, folders);

  return (
    <header className="grid gap-4 mb-4">
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{meeting.title}</h1>
          {meeting.tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Meeting type">
              {meeting.tags.map((tag) => (
                <li key={tag.id} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                  {tag.name}
                </li>
              ))}
            </ul>
          )}
          {!readOnly && <ShareButton meetingId={meeting.id} title={meeting.title} initial={share} />}
        </div>
        {!readOnly && <Description meetingId={meeting.id} initial={meeting.description} />}

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-4" aria-hidden />
            {formatMeetingDate(meeting.recordedAt, meeting.createdAt)}
          </span>
          {meeting.durationMs !== null && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />
              <span className="sr-only">Duration</span>
              {formatTimestamp(meeting.durationMs)}
            </span>
          )}
          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" disabled={folderMenu.pending} aria-label="Folder" />
                }
              >
                {meeting.folder ? (
                  <>
                    <Folder className="fill-yellow-400 text-yellow-400" aria-hidden />
                    {meeting.folder.name}
                  </>
                ) : (
                  <>
                    <FolderPlus aria-hidden />
                    Add to folder
                  </>
                )}
                <ChevronDown className="text-muted-foreground" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52">{folderMenu.menuItems}</DropdownMenuContent>
            </DropdownMenu>
          )}
          {folderMenu.dialog}
        </div>
      </div>

      {meeting.speakerDetails.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Speakers">
          {meeting.speakerDetails.map((s) => {
            const chip = (
              <span className="flex items-center gap-2 rounded-full border bg-card py-0.5 pr-3 pl-0.5 text-sm">
                <SpeakerAvatar name={s.name} color={colors.get(s.name) ?? UNKNOWN_SPEAKER} className="size-6 text-[10px]" />
                {s.name}
                {s.role && <span className="sr-only">, {s.role}</span>}
              </span>
            );
            return (
              <li key={s.id}>
                {s.role ? (
                  <Tooltip>
                    <TooltipTrigger render={<span tabIndex={0} className="rounded-full" />}>{chip}</TooltipTrigger>
                    <TooltipContent>{s.role}</TooltipContent>
                  </Tooltip>
                ) : (
                  chip
                )}
              </li>
            );
          })}
        </ul>
      )}

    </header>
  );
}

function Description({ meetingId, initial }: { meetingId: string; initial: string | null }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial ?? "");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function cancel() {
    setDraft(saved ?? "");
    setError(null);
    setEditing(false);
  }

  function save() {
    if (draft.trim() === (saved ?? "")) return cancel();
    startTransition(async () => {
      const result = await updateDescriptionAction(meetingId, draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(result.data);
      setDraft(result.data ?? "");
      setEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      toast.success("Description saved");
    });
  }

  if (!editing) {
    return (
      <div className="group/description my-2 flex gap-2">
        <p className={saved ? "leading-relaxed" : "text-muted-foreground italic"}>
          {saved ?? "No description yet."}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground"
          onClick={() => setEditing(true)}
          aria-label={saved ? "Edit description" : "Add description"}
        >
          <Pencil />
        </Button>
        {justSaved && (
          <span role="status" className="flex items-center gap-1 text-xs text-emerald-300">
            <Check className="size-3.5" aria-hidden /> Saved
          </span>
        )}
      </div>
    );
  }

  return (
    <form
      className="grid max-w-prose gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label htmlFor="meeting-description" className="sr-only">
        Description
      </label>
      <Textarea
        id="meeting-description"
        autoFocus
        value={draft}
        maxLength={2000}
        rows={3}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby="meeting-description-hint"
        placeholder="What was this meeting about?"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={pending}>
          Cancel
        </Button>
        <span id="meeting-description-hint" className="text-xs text-muted-foreground">
          {error ? (
            <span role="alert" className="text-destructive">
              {error}
            </span>
          ) : (
            `${draft.length}/2000 · Ctrl+Enter to save, Esc to cancel`
          )}
        </span>
      </div>
    </form>
  );
}
