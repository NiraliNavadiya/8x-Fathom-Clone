import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { askMeetly, searchTranscripts } from "@/lib/ask";
import { db } from "@/lib/db";
import { createMeeting, deleteMeeting, saveTranscript } from "@/lib/meetings";

const TEST_PREFIX = `test/${randomUUID()}/`;
// A made-up word so only this test's transcript can match.
const WORD = `zorblax${randomUUID().slice(0, 8)}`;

afterAll(async () => {
  await db().meeting.deleteMany({ where: { videoKey: { startsWith: TEST_PREFIX } } });
  await db().$disconnect();
});

async function meetingSaying(text: string) {
  const meeting = await createMeeting({
    title: "Ask test meeting",
    videoKey: `${TEST_PREFIX}${randomUUID()}.mp4`,
    videoContentType: "video/mp4",
    videoSizeBytes: 1,
  });
  await saveTranscript(meeting.id, {
    segments: [
      { speaker: "Dana Quill", startMs: 0, endMs: 5_000, text: "Opening remarks." },
      { speaker: "Eli", startMs: 85_000, endMs: 90_000, text },
    ],
  });
  return meeting;
}

describe("searchTranscripts", () => {
  it("finds segments by any word and returns the meeting and timestamp", async () => {
    const meeting = await meetingSaying(`The ${WORD} budget was approved.`);
    const hits = await searchTranscripts(`what happened with the ${WORD}?`);
    // Other transcripts may share a word ("happened"); the best match ranks first.
    expect(hits[0]).toEqual(
      { meetingId: meeting.id, meetingTitle: "Ask test meeting", startMs: 85_000, speaker: "Eli", text: `The ${WORD} budget was approved.` },
    );
  });

  it("matches speaker names", async () => {
    const meeting = await meetingSaying(`Something about ${WORD}.`);
    const hits = await searchTranscripts("what did quill say");
    expect(hits.some((h) => h.meetingId === meeting.id && h.speaker === "Dana Quill")).toBe(true);
  });

  it("skips deleted meetings and ignores queries with no searchable words", async () => {
    const meeting = await meetingSaying(`Deleted ${WORD} content.`);
    await deleteMeeting(meeting.id);
    expect((await searchTranscripts(WORD)).map((h) => h.meetingId)).not.toContain(meeting.id);
    expect(await searchTranscripts("?! a")).toEqual([]);
  });
});

describe("askMeetly", () => {
  it.skipIf(process.env.GEMINI_API_KEY)("returns passages without an answer when no AI key is set", async () => {
    await meetingSaying(`Plan the ${WORD} launch.`);
    const result = await askMeetly({ messages: [{ role: "user", content: `${WORD} launch?` }] });
    expect(result.answer).toBeNull();
    expect(result.citations[0]?.text).toBe(`Plan the ${WORD} launch.`);
  });
});
