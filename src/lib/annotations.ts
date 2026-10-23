import "server-only";

import { z } from "zod";
import { db } from "@/lib/db";
import { toAnnotationView, type AnnotationView } from "@/lib/meetings";

// Annotations on a meeting's transcript. The quote and times always come from
// the stored transcript segments, never from the client.

export class AnnotationInputError extends Error {}

const noteSchema = z.string().trim().max(2000, "Keep notes under 2,000 characters");
const typeSchema = z.enum(["HIGHLIGHT", "NOTE", "NEEDS_REVIEW"]);

export const createAnnotationSchema = z.object({
  meetingId: z.uuid(),
  type: typeSchema,
  startSegmentId: z.uuid(),
  startOffset: z.number().int().nonnegative(),
  endSegmentId: z.uuid(),
  endOffset: z.number().int().nonnegative(),
  note: noteSchema.optional(),
});

export const updateAnnotationSchema = z.object({
  type: typeSchema.optional(),
  note: noteSchema.nullable().optional(),
});

function checkNote(type: string, note: string | null | undefined) {
  if (type === "NOTE" && !note) throw new AnnotationInputError("A note needs some text.");
}

export async function createAnnotation(input: z.input<typeof createAnnotationSchema>): Promise<AnnotationView> {
  const data = createAnnotationSchema.parse(input);
  const note = data.note || null;
  checkNote(data.type, note);

  const segmentWhere = { transcript: { meetingId: data.meetingId, meeting: { isDeleted: false } } };
  const [start, end] = await Promise.all([
    db().transcriptSegment.findFirst({ where: { id: data.startSegmentId, ...segmentWhere } }),
    db().transcriptSegment.findFirst({ where: { id: data.endSegmentId, ...segmentWhere } }),
  ]);
  if (!start || !end || start.transcriptId !== end.transcriptId) {
    throw new AnnotationInputError("That text isn't part of this meeting's transcript.");
  }
  if (end.position < start.position || (end.id === start.id && data.endOffset <= data.startOffset)) {
    throw new AnnotationInputError("Select some text first.");
  }
  if (data.startOffset > start.text.length || data.endOffset > end.text.length) {
    throw new AnnotationInputError("The selection doesn't match the transcript text.");
  }

  // Rebuild the quote from the stored text, trimming whitespace at either end.
  const middle =
    end.position - start.position > 1
      ? await db().transcriptSegment.findMany({
          where: { transcriptId: start.transcriptId, position: { gt: start.position, lt: end.position } },
          orderBy: { position: "asc" },
          select: { text: true },
        })
      : [];
  let startOffset = data.startOffset;
  let endOffset = data.endOffset;
  while (startOffset < start.text.length && /\s/.test(start.text[startOffset])) startOffset++;
  while (endOffset > 0 && /\s/.test(end.text[endOffset - 1])) endOffset--;
  const quote =
    start.id === end.id
      ? start.text.slice(startOffset, endOffset)
      : [start.text.slice(startOffset), ...middle.map((m) => m.text), end.text.slice(0, endOffset)].join(" ").trim();
  if (!quote) throw new AnnotationInputError("Select some text first.");

  const annotation = await db().annotation.create({
    data: {
      meetingId: data.meetingId,
      type: data.type,
      startMs: start.startMs,
      endMs: end.endMs,
      startSegmentId: start.id,
      startOffset,
      endSegmentId: end.id,
      endOffset,
      quote,
      note,
    },
  });
  return toAnnotationView(annotation);
}

/** Returns null when the annotation doesn't exist (or its meeting is deleted). */
export async function updateAnnotation(
  id: string,
  input: z.input<typeof updateAnnotationSchema>,
): Promise<AnnotationView | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const patch = updateAnnotationSchema.parse(input);
  const current = await db().annotation.findFirst({ where: { id, meeting: { isDeleted: false } } });
  if (!current) return null;
  const type = patch.type ?? current.type;
  const note = patch.note === undefined ? current.note : patch.note || null;
  checkNote(type, note);
  return toAnnotationView(await db().annotation.update({ where: { id }, data: { type, note } }));
}

export async function deleteAnnotation(id: string): Promise<boolean> {
  if (!z.uuid().safeParse(id).success) return false;
  const { count } = await db().annotation.deleteMany({ where: { id, meeting: { isDeleted: false } } });
  return count > 0;
}
