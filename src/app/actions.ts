"use server";

import { refresh } from "next/cache";
import { createFolder, FolderExistsError, type FolderSummary } from "@/lib/folders";
import { z } from "zod";
import { ActionItemInputError, deleteActionItem, updateActionItem } from "@/lib/action-items";
import { AnnotationInputError, createAnnotation, deleteAnnotation, updateAnnotation } from "@/lib/annotations";
import { activateShareLink, addShareRecipients, removeShareRecipient, revokeShareLink } from "@/lib/shares";
import {
  deleteMeeting,
  moveMeetingToFolder,
  updateMeetingDescription,
  type ActionItemView,
  type AnnotationView,
} from "@/lib/meetings";

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

export async function updateDescriptionAction(id: string, description: string): Promise<Result<string | null>> {
  try {
    const saved = await updateMeetingDescription(id, description);
    if (saved === undefined) return { ok: false, error: "That meeting no longer exists." };
    refresh();
    return { ok: true, data: saved };
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return { ok: false, error: "Keep the description under 2,000 characters." };
    }
    throw error;
  }
}

// Expected input problems become a message for the UI; anything else is a real failure.
function inputError(error: unknown): string | null {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Check your input and try again.";
  if (error instanceof ActionItemInputError || error instanceof AnnotationInputError) return error.message;
  return null;
}

async function mutate<T>(run: () => Promise<T | null>, missing: string): Promise<Result<T>> {
  try {
    const data = await run();
    if (data === null) return { ok: false, error: missing };
    refresh();
    return { ok: true, data };
  } catch (error) {
    const message = inputError(error);
    if (message) return { ok: false, error: message };
    console.error(error);
    return { ok: false, error: "Couldn't save. Check your connection and try again." };
  }
}

const GONE_ITEM = "That action item no longer exists.";
const GONE_ANNOTATION = "That annotation no longer exists.";

export async function updateActionItemAction(
  id: string,
  patch: Parameters<typeof updateActionItem>[1],
): Promise<Result<ActionItemView>> {
  return mutate(() => updateActionItem(id, patch), GONE_ITEM);
}

export async function deleteActionItemAction(id: string): Promise<Result<true>> {
  return mutate(async () => ((await deleteActionItem(id)) ? true : null), GONE_ITEM);
}

export async function createAnnotationAction(
  input: Parameters<typeof createAnnotation>[0],
): Promise<Result<AnnotationView>> {
  return mutate(() => createAnnotation(input), "That meeting no longer exists.");
}

export async function updateAnnotationAction(
  id: string,
  patch: Parameters<typeof updateAnnotation>[1],
): Promise<Result<AnnotationView>> {
  return mutate(() => updateAnnotation(id, patch), GONE_ANNOTATION);
}

export async function deleteAnnotationAction(id: string): Promise<Result<true>> {
  return mutate(async () => ((await deleteAnnotation(id)) ? true : null), GONE_ANNOTATION);
}

// ─── Sharing ─────────────────────────────────────────────────────────────────
// No page refresh: the share dialog updates itself, which keeps these fast.

async function quick<T>(run: () => Promise<T | null>, missing: string): Promise<Result<T>> {
  try {
    const data = await run();
    return data === null ? { ok: false, error: missing } : { ok: true, data };
  } catch (error) {
    const message = error instanceof z.ZodError ? (error.issues[0]?.message ?? "Check your input.") : null;
    if (!message) console.error(error);
    return { ok: false, error: message ?? "Couldn't save sharing changes. Try again." };
  }
}

const GONE_MEETING = "That meeting no longer exists.";

const STALE_LINK = "This link was changed or revoked. Close and reopen Share.";

export async function activateShareLinkAction(meetingId: string, version: number): Promise<Result<string>> {
  return quick(() => activateShareLink(meetingId, version), STALE_LINK);
}

/** Returns the new (not yet active) link. */
export async function revokeShareLinkAction(meetingId: string): Promise<Result<{ token: string; version: number }>> {
  return quick(() => revokeShareLink(meetingId), GONE_MEETING);
}

export async function addShareRecipientsAction(
  meetingId: string,
  version: number,
  emails: string[],
): Promise<Result<string[]>> {
  return quick(() => addShareRecipients(meetingId, version, emails), STALE_LINK);
}

export async function removeShareRecipientAction(meetingId: string, email: string): Promise<Result<true>> {
  return quick(async () => ((await removeShareRecipient(meetingId, email)) ? true : null), "That person was already removed.");
}
