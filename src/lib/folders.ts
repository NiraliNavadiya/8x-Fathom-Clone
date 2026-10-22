import "server-only";

import { z } from "zod";
import { db } from "@/lib/db";

export type FolderSummary = { id: string; name: string; meetingCount: number };

export const folderNameSchema = z.string().trim().min(1, "Enter a folder name").max(100);

const notDeleted = { where: { isDeleted: false } };

export async function listFolders(): Promise<FolderSummary[]> {
  const folders = await db().folder.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { meetings: notDeleted } } },
  });
  return folders.map((f) => ({ id: f.id, name: f.name, meetingCount: f._count.meetings }));
}

export async function getFolder(id: string): Promise<FolderSummary | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const f = await db().folder.findUnique({
    where: { id },
    include: { _count: { select: { meetings: notDeleted } } },
  });
  return f && { id: f.id, name: f.name, meetingCount: f._count.meetings };
}

// Folder names are unique (case-insensitively) until folders belong to users.
export async function createFolder(name: string): Promise<FolderSummary> {
  const clean = folderNameSchema.parse(name);
  const existing = await db().folder.findFirst({
    where: { ownerId: null, name: { equals: clean, mode: "insensitive" } },
  });
  if (existing) throw new FolderExistsError(existing.name);
  const folder = await db().folder.create({ data: { name: clean } });
  return { id: folder.id, name: folder.name, meetingCount: 0 };
}

export class FolderExistsError extends Error {
  constructor(name: string) {
    super(`A folder named "${name}" already exists`);
  }
}
