import "server-only";

import { z } from "zod";
import { db } from "@/lib/db";
import { toActionItemView, type ActionItemView } from "@/lib/meetings";

export class ActionItemInputError extends Error {}

export const updateActionItemSchema = z.object({
  description: z.string().trim().min(1, "A task needs a description").max(1000).optional(),
  // A speaker in the same meeting, or null for unassigned.
  assigneeId: z.uuid().nullable().optional(),
  dueDate: z.iso.date().nullable().optional(),
  completed: z.boolean().optional(),
});

/** Returns null when the item doesn't exist (or its meeting is deleted). */
export async function updateActionItem(
  id: string,
  input: z.input<typeof updateActionItemSchema>,
): Promise<ActionItemView | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const patch = updateActionItemSchema.parse(input);
  const item = await db().actionItem.findFirst({ where: { id, meeting: { isDeleted: false } } });
  if (!item) return null;

  if (patch.assigneeId) {
    const speaker = await db().meetingSpeaker.findFirst({ where: { id: patch.assigneeId, meetingId: item.meetingId } });
    if (!speaker) throw new ActionItemInputError("That person isn't in this meeting.");
  }

  const updated = await db().actionItem.update({
    where: { id },
    data: {
      description: patch.description,
      assigneeId: patch.assigneeId,
      dueDate: patch.dueDate === undefined ? undefined : patch.dueDate && new Date(`${patch.dueDate}T00:00:00Z`),
      completed: patch.completed,
    },
    include: { assignee: true },
  });
  return toActionItemView(updated);
}

export async function deleteActionItem(id: string): Promise<boolean> {
  if (!z.uuid().safeParse(id).success) return false;
  const { count } = await db().actionItem.deleteMany({ where: { id, meeting: { isDeleted: false } } });
  return count > 0;
}
