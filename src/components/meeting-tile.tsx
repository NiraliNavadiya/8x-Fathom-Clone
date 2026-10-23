"use client";

import { Folder, MoreVertical, Share2, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { deleteMeetingAction } from "@/app/actions";
import { useFolderMenu } from "@/components/folder-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { FolderSummary } from "@/lib/folders";
import { formatMeetingDate, formatTimestamp, initials } from "@/lib/format";
import type { MeetingSummary } from "@/lib/meetings";
import type { ShareInfo } from "@/lib/shares";
import { ShareButton } from "@/components/meeting/share-dialog";

const MAX_AVATARS = 3;

export function MeetingTile({
  meeting,
  folders,
  share,
  selected,
  onDeleted,
}: {
  meeting: MeetingSummary;
  folders: FolderSummary[];
  share: ShareInfo | null;
  selected: boolean;
  onDeleted: (id: string) => void;
}) {
  const [deleting, startTransition] = useTransition();
  const folderMenu = useFolderMenu(meeting, folders);
  const pending = deleting || folderMenu.pending;
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const href = `/meetings/${meeting.id}`;

  function remove() {
    onDeleted(meeting.id); // hide right away; the action confirms
    startTransition(async () => {
      const result = await deleteMeetingAction(meeting.id);
      if (result.ok) toast.success(`Deleted “${meeting.title}”`);
      else toast.error(result.error);
    });
  }

  const extraSpeakers = meeting.speakers.length - MAX_AVATARS;

  return (
    <article
      data-selected={selected || undefined}
      aria-busy={pending || undefined}
      className="group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-lg hover:shadow-black/40 focus-within:border-foreground/25 data-selected:border-primary data-selected:ring-2 data-selected:ring-primary/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="relative aspect-video bg-black">
        {thumbnailFailed ? (
          <div className="grid size-full place-items-center bg-muted">
            <Video className="size-8 text-muted-foreground" aria-hidden />
          </div>
        ) : (
          // First frame as a thumbnail; `#t=` skips a black opening frame.
          <video
            src={`/api/meetings/${meeting.id}/video#t=1`}
            preload="metadata"
            muted
            playsInline
            tabIndex={-1}
            aria-hidden
            onError={() => setThumbnailFailed(true)}
            className="pointer-events-none size-full object-cover"
          />
        )}
        {meeting.durationMs !== null && (
          <span className="absolute right-2 bottom-2 rounded bg-black/75 px-1.5 py-0.5 font-mono text-xs text-white tabular-nums">
            {formatTimestamp(meeting.durationMs)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-medium leading-snug">
            {/* Stretched link: the whole tile opens the meeting. */}
            <Link
              href={href}
              className="outline-none after:absolute after:inset-0 after:content-['']"
            >
              {meeting.title}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMeetingDate(meeting.recordedAt, meeting.createdAt)}
            {meeting.folder && (
              <span className="inline-flex items-center gap-1">
                {" · "}
                <Folder className="size-3.5 fill-yellow-400 text-yellow-400" aria-hidden />
                {meeting.folder.name}
              </span>
            )}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          {meeting.speakers.length > 0 ? (
            <ul className="flex -space-x-2" aria-label={`Speakers: ${meeting.speakers.join(", ")}`}>
              {meeting.speakers.slice(0, MAX_AVATARS).map((name) => (
                <li
                  key={name}
                  title={name}
                  className="grid size-7 place-items-center rounded-full border-2 border-card bg-secondary text-[0.6875rem] font-semibold text-secondary-foreground"
                >
                  {initials(name)}
                </li>
              ))}
              {extraSpeakers > 0 && (
                <li className="grid size-7 place-items-center rounded-full border-2 border-card bg-muted text-[0.6875rem] font-medium text-muted-foreground">
                  +{extraSpeakers}
                </li>
              )}
            </ul>
          ) : (
            <span className="text-xs text-muted-foreground">No speakers yet</span>
          )}
          {meeting.tags.length > 0 && (
            <ul className="flex min-w-0 flex-wrap justify-end gap-1" aria-label="Tags">
              {meeting.tags.map((tag) => (
                <li
                  key={tag.id}
                  className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Actions sit above the stretched link. Hover icons are for pointers;
          the ⋮ menu is always there for touch and keyboard users. */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <div className="flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:hidden">
          <div className="relative z-10">
            <ShareButton meetingId={meeting.id} title={meeting.title} initial={share} compact />
          </div>
          <TileIconButton label="Delete" onClick={remove} className="hover:text-destructive">
            <Trash2 />
          </TileIconButton>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="secondary"
                size="icon-sm"
                className="bg-black/60 text-white backdrop-blur hover:bg-black/80"
                aria-label={`Actions for ${meeting.title}`}
              />
            }
          >
            <MoreVertical />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem disabled>
              <Share2 /> Share
              <span className="ml-auto text-xs text-muted-foreground">Soon</span>
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Folder /> Move to folder
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                {folderMenu.menuItems}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={remove}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {folderMenu.dialog}
    </article>
  );
}

function TileIconButton({
  label,
  className,
  ...props
}: React.ComponentProps<"button"> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label={label}
            className={cn("bg-black/60 text-white backdrop-blur hover:bg-black/80", className)}
            {...props}
          />
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
