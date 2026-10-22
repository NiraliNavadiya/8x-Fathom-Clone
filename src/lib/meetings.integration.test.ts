import { randomUUID } from "node:crypto";
import type { TLSSocket } from "node:tls";
import { Client } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { db, withVerifiedTls } from "@/lib/db";
import { databaseEnv } from "@/lib/env";
import {
  createMeeting,
  deleteMeeting,
  getMeeting,
  listMeetings,
  saveTranscript,
  type TranscriptSegmentInput,
} from "@/lib/meetings";

// Test rows use this key prefix and are removed afterwards. They are rows only;
// no storage objects are created.
const TEST_PREFIX = `test/${randomUUID()}/`;

function newMeeting(title = "Integration test meeting") {
  return createMeeting({
    title,
    videoKey: `${TEST_PREFIX}${randomUUID()}.mp4`,
    videoContentType: "video/mp4",
    videoSizeBytes: 5_000_000_000, // above 2^32, exercises the BIGINT column
  });
}

const segments: TranscriptSegmentInput[] = [
  { speaker: "Alice", startMs: 0, endMs: 4_500, text: "Welcome to the sync." },
  { speaker: "Bob", startMs: 4_500, endMs: 9_000, text: "Thanks, let's start." },
];

// The stored shape: input fields plus id and position.
const storedSegments = segments.map((s, position) => ({ ...s, position, id: expect.any(String) }));

afterAll(async () => {
  await db().meeting.deleteMany({ where: { videoKey: { startsWith: TEST_PREFIX } } });
  await db().$disconnect();
});

describe("connection", () => {
  it("queries the Neon database through Prisma", async () => {
    const [row] = await db().$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
    expect(row.db).toBe("neondb");
  });

  it("connects over TLS with a verified certificate", async () => {
    const connectionString = withVerifiedTls(databaseEnv().DATABASE_URL);
    expect(new URL(connectionString).searchParams.get("sslmode")).toBe("verify-full");

    const client = new Client({ connectionString });
    await client.connect();
    try {
      // pg keeps its socket on an undocumented field; it is a TLSSocket once upgraded.
      const socket = (client as unknown as { connection: { stream: TLSSocket } }).connection.stream;
      expect(socket.encrypted).toBe(true);
      expect(socket.authorized).toBe(true);
    } finally {
      await client.end();
    }
  });
});

describe("schema", () => {
  it("has the migration applied", async () => {
    const rows = await db().$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL`;
    expect(rows.map((r) => r.migration_name)).toContainEqual(
      expect.stringMatching(/_init_meetings_transcripts$/),
    );
  });

  it("has the expected columns", async () => {
    const rows = await db().$queryRaw<{ table_name: string; column_name: string; data_type: string }[]>`
      SELECT table_name, column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public'`;
    const columns = Object.fromEntries(rows.map((r) => [`${r.table_name}.${r.column_name}`, r.data_type]));

    expect(columns).toMatchObject({
      "meetings.id": "uuid",
      "meetings.video_key": "text",
      "meetings.video_size_bytes": "bigint",
      "meetings.status": "USER-DEFINED",
      "transcripts.meeting_id": "uuid",
      "transcript_segments.start_ms": "integer",
      "summaries.content": "jsonb",
      "ask_messages.citations": "jsonb",
    });
  });

  it("has a table for every planned feature", async () => {
    const rows = await db().$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    expect(rows.map((r) => r.table_name)).toEqual(
      expect.arrayContaining([
        "users", "meetings", "folders", "tags", "meeting_tags", "meeting_speakers",
        "transcripts", "transcript_segments", "summaries", "annotations",
        "timeline_sections", "action_items", "ask_threads", "ask_messages",
        "shares", "share_recipients",
      ]),
    );
  });

  it("allows at most 4 timeline sections per meeting", async () => {
    const meeting = await newMeeting();
    const section = (position: number) => ({
      meetingId: meeting.id, position, title: `Part ${position + 1}`,
      startMs: position * 1000, endMs: position * 1000 + 999,
    });

    await db().timelineSection.createMany({ data: [0, 1, 2, 3].map(section) });
    // A fifth section would need position 4, which the CHECK constraint rejects.
    await expect(db().timelineSection.create({ data: section(4) })).rejects.toThrow(/position_check/);
    // Positions 0–3 are already taken, so there is no other way to add a fifth.
    await expect(db().timelineSection.create({ data: section(0) })).rejects.toMatchObject({ code: "P2002" });
  });

  it("rejects time ranges that end before they start", async () => {
    const meeting = await newMeeting();
    await expect(
      db().annotation.create({
        data: { meetingId: meeting.id, type: "NOTE", startMs: 5_000, endMs: 1_000, quote: "x" },
      }),
    ).rejects.toThrow(/annotations_range_check/);
  });

  it("links transcripts to meetings with a cascading foreign key", async () => {
    const [fk] = await db().$queryRaw<{ ref_table: string; delete_rule: string }[]>`
      SELECT ccu.table_name AS ref_table, rc.delete_rule
      FROM information_schema.referential_constraints rc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = rc.constraint_name
      WHERE rc.constraint_name = 'transcripts_meeting_id_fkey'`;
    expect(fk).toEqual({ ref_table: "meetings", delete_rule: "CASCADE" });
  });
});

describe("insert and fetch", () => {
  it("creates a meeting and reads it back", async () => {
    const created = await newMeeting("Quarterly planning");
    expect(created).toMatchObject({
      title: "Quarterly planning",
      status: "UPLOADED",
      videoSizeBytes: 5_000_000_000,
      hasTranscript: false,
    });

    const fetched = await getMeeting(created.id);
    expect(fetched).toEqual({ ...created, transcript: null });

    const listed = await listMeetings();
    expect(listed.map((m) => m.id)).toContain(created.id);
  });

  it("saves a transcript, marks the meeting ready and reads it back", async () => {
    const meeting = await newMeeting();
    const saved = await saveTranscript(meeting.id, { segments });

    expect(saved).toMatchObject({
      language: "en",
      segments: storedSegments,
      text: "Alice: Welcome to the sync.\nBob: Thanks, let's start.",
    });

    const fetched = await getMeeting(meeting.id);
    expect(fetched?.status).toBe("READY");
    expect(fetched?.hasTranscript).toBe(true);
    expect(fetched?.transcript).toEqual(saved);
  });

  it("returns null for unknown or malformed ids", async () => {
    expect(await getMeeting(randomUUID())).toBeNull();
    expect(await getMeeting("not-a-uuid")).toBeNull();
    expect(await saveTranscript(randomUUID(), { segments })).toBeNull();
  });

  it("rejects invalid transcript input", async () => {
    const meeting = await newMeeting();
    await expect(saveTranscript(meeting.id, { segments: [] })).rejects.toBeInstanceOf(ZodError);
    await expect(
      saveTranscript(meeting.id, {
        segments: [{ speaker: "A", startMs: 5_000, endMs: 1_000, text: "x" }],
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

describe("relationships", () => {
  it("keeps one transcript per meeting; saving again replaces it", async () => {
    const meeting = await newMeeting();
    const first = await saveTranscript(meeting.id, { segments });
    const second = await saveTranscript(meeting.id, { segments: segments.slice(0, 1), language: "de" });

    expect(second?.id).toBe(first?.id);
    expect(await db().transcript.count({ where: { meetingId: meeting.id } })).toBe(1);
    expect((await getMeeting(meeting.id))?.transcript?.language).toBe("de");

    await expect(
      db().transcript.create({ data: { meetingId: meeting.id, text: "dup" } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("rejects a transcript for a meeting that does not exist", async () => {
    await expect(
      db().transcript.create({ data: { meetingId: randomUUID(), text: "orphan" } }),
    ).rejects.toMatchObject({ code: "P2003" });
  });

  it("creates speakers from the transcript and links segments to them", async () => {
    const meeting = await newMeeting();
    await saveTranscript(meeting.id, { segments });
    await saveTranscript(meeting.id, { segments }); // saving again adds no duplicates

    const speakers = await db().meetingSpeaker.findMany({
      where: { meetingId: meeting.id },
      select: { name: true, _count: { select: { segments: true } } },
      orderBy: { name: "asc" },
    });
    expect(speakers).toEqual([
      { name: "Alice", _count: { segments: 1 } },
      { name: "Bob", _count: { segments: 1 } },
    ]);
  });

  it("soft-deletes: hides the meeting but keeps its row and data", async () => {
    const meeting = await newMeeting();
    await saveTranscript(meeting.id, { segments });

    expect(await deleteMeeting(meeting.id)).toBe(true);
    expect(await deleteMeeting(meeting.id)).toBe(false); // already deleted
    expect(await getMeeting(meeting.id)).toBeNull();
    expect((await listMeetings()).map((m) => m.id)).not.toContain(meeting.id);

    const row = await db().meeting.findUniqueOrThrow({ where: { id: meeting.id }, include: { transcript: true } });
    expect(row.isDeleted).toBe(true);
    expect(row.transcript).not.toBeNull();
  });

  it("deletes everything that belongs to a meeting when its row is deleted", async () => {
    const meeting = await newMeeting();
    await saveTranscript(meeting.id, { segments });
    const speaker = await db().meetingSpeaker.findFirstOrThrow({ where: { meetingId: meeting.id } });
    await db().summary.create({ data: { meetingId: meeting.id, template: "AI_NOTES" } });
    await db().annotation.create({
      data: { meetingId: meeting.id, type: "HIGHLIGHT", startMs: 0, endMs: 1_000, quote: "Welcome" },
    });
    await db().actionItem.create({
      data: { meetingId: meeting.id, description: "Send notes", assigneeId: speaker.id },
    });
    await db().askThread.create({
      data: { meetingId: meeting.id, messages: { create: { role: "USER", content: "What was decided?" } } },
    });
    await db().share.create({
      data: {
        meetingId: meeting.id, scope: "SUMMARY", access: "RESTRICTED", tokenHash: randomUUID(),
        recipients: { create: { email: "someone@example.com" } },
      },
    });

    await db().meeting.delete({ where: { id: meeting.id } });

    const where = { meetingId: meeting.id };
    const counts = await Promise.all([
      db().transcript.count({ where }), db().meetingSpeaker.count({ where }),
      db().summary.count({ where }), db().annotation.count({ where }),
      db().actionItem.count({ where }), db().askThread.count({ where }), db().share.count({ where }),
    ]);
    expect(counts).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("files meetings in folders and keeps them when a folder is deleted", async () => {
    const meeting = await newMeeting();
    const folder = await db().folder.create({ data: { name: `Test folder ${randomUUID()}` } });
    await db().meeting.update({ where: { id: meeting.id }, data: { folderId: folder.id } });
    expect((await db().meeting.findUniqueOrThrow({ where: { id: meeting.id } })).folderId).toBe(folder.id);

    await db().folder.delete({ where: { id: folder.id } });
    const after = await db().meeting.findUniqueOrThrow({ where: { id: meeting.id } });
    expect(after.folderId).toBeNull();
  });

  it("tags meetings for search", async () => {
    const meeting = await newMeeting();
    const tag = await db().tag.create({ data: { name: `test-tag-${randomUUID()}` } });
    await db().meetingTag.create({ data: { meetingId: meeting.id, tagId: tag.id } });

    const tagged = await db().meeting.findMany({ where: { tags: { some: { tag: { name: tag.name } } } } });
    expect(tagged.map((m) => m.id)).toEqual([meeting.id]);
    await db().tag.delete({ where: { id: tag.id } });
  });

  it("keeps one summary per template", async () => {
    const meeting = await newMeeting();
    await db().summary.create({ data: { meetingId: meeting.id, template: "MEETING_MINUTES" } });
    await expect(
      db().summary.create({ data: { meetingId: meeting.id, template: "MEETING_MINUTES" } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("rejects a second meeting for the same video", async () => {
    const meeting = await newMeeting();
    const row = await db().meeting.findUniqueOrThrow({ where: { id: meeting.id } });
    await expect(
      createMeeting({
        title: "Duplicate",
        videoKey: row.videoKey,
        videoContentType: "video/mp4",
        videoSizeBytes: 1,
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});

describe("imported videos", () => {
  it("has a meeting for each video already in storage", async () => {
    const rows = await db().meeting.findMany({
      where: { videoKey: { in: ["Fathom Test Meeting 4 - Oct 21 2026.mp4", "meeting_1.mp4"] } },
      select: { videoKey: true, videoSizeBytes: true },
      orderBy: { videoKey: "asc" },
    });
    expect(rows).toEqual([
      { videoKey: "Fathom Test Meeting 4 - Oct 21 2026.mp4", videoSizeBytes: BigInt(3_880_665) },
      { videoKey: "meeting_1.mp4", videoSizeBytes: BigInt(67_603_686) },
    ]);
  });
});
