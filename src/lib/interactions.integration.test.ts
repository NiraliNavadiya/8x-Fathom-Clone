import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { ActionItemInputError, deleteActionItem, updateActionItem } from "@/lib/action-items";
import { AnnotationInputError, createAnnotation, deleteAnnotation, updateAnnotation } from "@/lib/annotations";
import { db } from "@/lib/db";
import { createMeeting, deleteMeeting, getMeetingWorkspace, saveTranscript } from "@/lib/meetings";

const TEST_PREFIX = `test/${randomUUID()}/`;

afterAll(async () => {
  await db().meeting.deleteMany({ where: { videoKey: { startsWith: TEST_PREFIX } } });
  await db().$disconnect();
});

async function meetingWithTranscript() {
  const meeting = await createMeeting({
    title: "Interactions test",
    videoKey: `${TEST_PREFIX}${randomUUID()}.mp4`,
    videoContentType: "video/mp4",
    videoSizeBytes: 1,
  });
  const transcript = await saveTranscript(meeting.id, {
    segments: [
      { speaker: "Ana", startMs: 1_000, endMs: 6_000, text: "We ship on Friday if payments work." },
      { speaker: "Ben", startMs: 6_000, endMs: 9_000, text: "I'll test checkout." },
      { speaker: "Ana", startMs: 9_000, endMs: 12_000, text: "Great, thanks Ben." },
    ],
  });
  const [s0, s1, s2] = transcript!.segments;
  const speakers = await db().meetingSpeaker.findMany({ where: { meetingId: meeting.id } });
  const ben = speakers.find((s) => s.name === "Ben")!;
  return { meeting, s0, s1, s2, ben };
}

describe("annotations", () => {
  it("creates a highlight from a selection, taking quote and times from the transcript", async () => {
    const { meeting, s0 } = await meetingWithTranscript();
    // " ship on Friday " with stray spaces: trimmed to "ship on Friday"
    const a = await createAnnotation({
      meetingId: meeting.id, type: "HIGHLIGHT", startSegmentId: s0.id, startOffset: 2, endSegmentId: s0.id, endOffset: 18,
    });
    expect(a).toMatchObject({
      type: "HIGHLIGHT", quote: "ship on Friday", startMs: 1_000, endMs: 6_000,
      startSegmentId: s0.id, startOffset: 3, endSegmentId: s0.id, endOffset: 17, note: null,
    });
  });

  it("joins a selection across segments", async () => {
    const { meeting, s0, s2 } = await meetingWithTranscript();
    const a = await createAnnotation({
      meetingId: meeting.id, type: "NEEDS_REVIEW", startSegmentId: s0.id, startOffset: 21, endSegmentId: s2.id, endOffset: 5,
      note: "Confirm owner",
    });
    expect(a.quote).toBe("payments work. I'll test checkout. Great");
    expect([a.startMs, a.endMs]).toEqual([1_000, 12_000]);
  });

  it("rejects bad selections without saving anything", async () => {
    const { meeting, s0, s1 } = await meetingWithTranscript();
    const other = await meetingWithTranscript();
    const base = { meetingId: meeting.id, type: "HIGHLIGHT" as const };
    const cases = [
      { ...base, startSegmentId: s0.id, startOffset: 5, endSegmentId: s0.id, endOffset: 5 }, // empty
      { ...base, startSegmentId: s1.id, startOffset: 0, endSegmentId: s0.id, endOffset: 3 }, // backwards
      { ...base, startSegmentId: s0.id, startOffset: 0, endSegmentId: s0.id, endOffset: 999 }, // past the text
      { ...base, startSegmentId: other.s0.id, startOffset: 0, endSegmentId: other.s0.id, endOffset: 3 }, // other meeting
      { ...base, type: "NOTE" as const, startSegmentId: s0.id, startOffset: 0, endSegmentId: s0.id, endOffset: 3 }, // note without text
    ];
    for (const input of cases) await expect(createAnnotation(input)).rejects.toBeInstanceOf(AnnotationInputError);
    expect(await db().annotation.count({ where: { meetingId: meeting.id } })).toBe(0);
  });

  it("edits type and note, then deletes", async () => {
    const { meeting, s1 } = await meetingWithTranscript();
    const a = await createAnnotation({
      meetingId: meeting.id, type: "HIGHLIGHT", startSegmentId: s1.id, startOffset: 0, endSegmentId: s1.id, endOffset: 4,
    });
    expect(await updateAnnotation(a.id, { type: "NOTE", note: "Ben owns it" })).toMatchObject({ type: "NOTE", note: "Ben owns it" });
    await expect(updateAnnotation(a.id, { note: "" })).rejects.toBeInstanceOf(AnnotationInputError); // a note needs text
    expect(await updateAnnotation(a.id, { type: "NEEDS_REVIEW", note: "" })).toMatchObject({ note: null });
    expect(await deleteAnnotation(a.id)).toBe(true);
    expect(await deleteAnnotation(a.id)).toBe(false);
    expect(await updateAnnotation(a.id, { note: "x" })).toBeNull();
  });
});

describe("action items", () => {
  it("edits description, assignee, due date and completion", async () => {
    const { meeting, ben } = await meetingWithTranscript();
    const item = await db().actionItem.create({ data: { meetingId: meeting.id, description: "Test checkout", timestampMs: 6_000 } });

    const updated = await updateActionItem(item.id, {
      description: "  Test the checkout flow ", assigneeId: ben.id, dueDate: "2026-10-28", completed: true,
    });
    expect(updated).toMatchObject({
      description: "Test the checkout flow", assignee: { id: ben.id, name: "Ben" }, dueDate: "2026-10-28",
      completed: true, timestampMs: 6_000,
    });
    expect(await updateActionItem(item.id, { assigneeId: null, dueDate: null, completed: false })).toMatchObject({
      assignee: null, dueDate: null, completed: false,
    });
    const page = await getMeetingWorkspace(meeting.id);
    expect(page?.actionItems.map((a) => a.description)).toEqual(["Test the checkout flow"]);
  });

  it("rejects an assignee from another meeting and empty descriptions", async () => {
    const { meeting } = await meetingWithTranscript();
    const other = await meetingWithTranscript();
    const item = await db().actionItem.create({ data: { meetingId: meeting.id, description: "Keep me" } });
    await expect(updateActionItem(item.id, { assigneeId: other.ben.id })).rejects.toBeInstanceOf(ActionItemInputError);
    await expect(updateActionItem(item.id, { description: "   " })).rejects.toThrow();
    expect((await db().actionItem.findUniqueOrThrow({ where: { id: item.id } })).description).toBe("Keep me");
  });

  it("deletes, and treats deleted meetings and unknown ids as missing", async () => {
    const { meeting } = await meetingWithTranscript();
    const item = await db().actionItem.create({ data: { meetingId: meeting.id, description: "Remove me" } });
    expect(await updateActionItem(randomUUID(), { completed: true })).toBeNull();
    expect(await updateActionItem("not-a-uuid", { completed: true })).toBeNull();

    await deleteMeeting(meeting.id); // soft delete hides its items too
    expect(await updateActionItem(item.id, { completed: true })).toBeNull();
    expect(await deleteActionItem(item.id)).toBe(false);
    await db().meeting.update({ where: { id: meeting.id }, data: { isDeleted: false } });
    expect(await deleteActionItem(item.id)).toBe(true);
  });
});
