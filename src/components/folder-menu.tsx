"use client";

import { Check, Folder, FolderPlus, FolderX } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { moveMeetingAction } from "@/app/actions";
import { NewFolderDialog } from "@/components/new-folder-dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { FolderSummary } from "@/lib/folders";

type FolderRef = { id: string; name: string };

/**
 * Moving a meeting between folders, shared by the call tiles and the meeting
 * page. Render `menuItems` inside a dropdown and `dialog` anywhere.
 */
export function useFolderMenu(meeting: { id: string; title: string; folder: FolderRef | null }, folders: FolderSummary[]) {
  const [pending, startTransition] = useTransition();
  const [newFolderOpen, setNewFolderOpen] = useState(false);

  function move(folder: FolderRef | null) {
    startTransition(async () => {
      const result = await moveMeetingAction(meeting.id, folder?.id ?? null);
      if (!result.ok) toast.error(result.error);
      else toast.success(folder ? `Moved to ${folder.name}` : "Removed from folder");
    });
  }

  const current = meeting.folder?.id;
  const menuItems = (
    <>
      {folders.map((folder) => (
        <DropdownMenuItem key={folder.id} disabled={current === folder.id} onClick={() => move(folder)}>
          <Folder className="fill-yellow-400 text-yellow-400" />
          <span className="truncate">{folder.name}</span>
          {current === folder.id && <Check className="ml-auto" aria-label="Current folder" />}
        </DropdownMenuItem>
      ))}
      {folders.length > 0 && <DropdownMenuSeparator />}
      {meeting.folder && (
        <DropdownMenuItem onClick={() => move(null)}>
          <FolderX /> Remove from folder
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={() => setNewFolderOpen(true)}>
        <FolderPlus /> New folder…
      </DropdownMenuItem>
    </>
  );

  const dialog = (
    <NewFolderDialog
      open={newFolderOpen}
      onOpenChange={setNewFolderOpen}
      description={`“${meeting.title}” will be moved into it.`}
      onCreated={(folder) => move(folder)}
    />
  );

  return { pending, menuItems, dialog };
}
