"use server";

import { refresh } from "next/cache";
import { createFolder, FolderExistsError, type FolderSummary } from "@/lib/folders";
import { deleteMeeting, moveMeetingToFolder } from "@/lib/meetings";

// Actions return a result instead of throwing so the UI can show the message.
type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function deleteMeetingAction(id: string): Promise<Result> {
  if (!(await deleteMeeting(id))) return { ok: false, error: "That meeting no longer exists." };
  refresh();
  return { ok: true, data: undefined };
}

export async function moveMeetingAction(id: string, folderId: string | null): Promise<Result> {
  try {
    if (!(await moveMeetingToFolder(id, folderId))) return { ok: false, error: "That meeting no longer exists." };
  } catch {
    // Foreign key violation: the folder was removed meanwhile.
    return { ok: false, error: "That folder no longer exists." };
  }
  refresh();
  return { ok: true, data: undefined };
}

export async function createFolderAction(name: string): Promise<Result<FolderSummary>> {
  try {
    const folder = await createFolder(name);
    refresh();
    return { ok: true, data: folder };
  } catch (error) {
    if (error instanceof FolderExistsError) return { ok: false, error: error.message };
    if (error instanceof Error && error.name === "ZodError") return { ok: false, error: "Enter a folder name (up to 100 characters)." };
    throw error;
  }
}
