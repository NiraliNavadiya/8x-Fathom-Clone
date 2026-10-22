// Seeds the two test meetings onto the videos already in Neon Object Storage.
// Idempotent: rerunning updates rows in place instead of duplicating them, and
// rows it doesn't own (other tags, annotations, action items) are left alone.
// Run with `npm run db:seed` after `npm run videos:import`.
import "../../src/test/load-env";

import { readFileSync } from "node:fs";
import { db } from "@/lib/db";
import { summaryContentSchemas } from "@/lib/summaries";
import { parseBlockTranscript, parseInlineTranscript, type ParsedSegment } from "@/lib/transcript-parse";
import type { SummaryTemplate } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { seedMeetings, type SeedMeeting } from "./data";

type Tx = Prisma.TransactionClient;

function parse(m: SeedMeeting): ParsedSegment[] {
  const source = readFileSync(new URL(`./transcripts/${m.transcriptFile}`, import.meta.url), "utf8");
  return (m.format === "inline" ? parseInlineTranscript : parseBlockTranscript)(source, m.durationMs);
}

async function findOrCreate<T>(find: () => Promise<T | null>, create: () => Promise<T>): Promise<T> {
  return (await find()) ?? create();
}

async function seedMeeting(tx: Tx, m: SeedMeeting, segments: ParsedSegment[]) {
  const existing = await tx.meeting.findUnique({ where: { videoKey: m.videoKey }, select: { id: true } });
  if (!existing) throw new Error(`No meeting for video key "${m.videoKey}". Run \`npm run videos:import\` first.`);
  const meetingId = existing.id;

  // Folders and tags have no owner until there is auth, so match on name.
  const folder = await findOrCreate(
    () => tx.folder.findFirst({ where: { ownerId: null, name: m.folder } }),
    () => tx.folder.create({ data: { name: m.folder } }),
  );
  await tx.meeting.update({
    where: { id: meetingId },
    data: {
      title: m.title,
      description: m.description,
      recordedAt: m.recordedAt,
      durationMs: m.durationMs,
      folderId: folder.id,
      status: "READY",
    },
  });
  for (const name of m.tags) {
    const tag = await findOrCreate(
      () => tx.tag.findFirst({ where: { ownerId: null, name } }),
      () => tx.tag.create({ data: { name } }),
    );
    await tx.meetingTag.upsert({
      where: { meetingId_tagId: { meetingId, tagId: tag.id } },
      create: { meetingId, tagId: tag.id },
      update: {},
    });
  }

  const speakerIds = new Map<string, string>();
  for (const { name, role } of m.speakers) {
    const s = await tx.meetingSpeaker.upsert({
      where: { meetingId_name: { meetingId, name } },
      create: { meetingId, name, role },
      update: { role },
    });
    speakerIds.set(name, s.id);
  }
  const speakerId = (name: string) => {
    const id = speakerIds.get(name);
    if (!id) throw new Error(`Speaker "${name}" is not listed for "${m.title}"`);
    return id;
  };

  // Rewrite segments only when they changed, so annotation segment ids stay stable.
  const text = segments.map((s) => `${s.speaker}: ${s.text}`).join("\n");
  const transcript = await tx.transcript.upsert({
    where: { meetingId },
    create: { meetingId, language: "en", text },
    update: { language: "en", text },
    include: { segments: { orderBy: { position: "asc" }, include: { speaker: true } } },
  });
  const current = transcript.segments.map((s) => [s.speaker?.name, s.startMs, s.endMs, s.text]);
  const wanted = segments.map((s) => [s.speaker, s.startMs, s.endMs, s.text]);
  if (JSON.stringify(current) !== JSON.stringify(wanted)) {
    await tx.transcriptSegment.deleteMany({ where: { transcriptId: transcript.id } });
    await tx.transcriptSegment.createMany({
      data: segments.map((s, position) => ({
        transcriptId: transcript.id,
        position,
        speakerId: speakerId(s.speaker),
        startMs: s.startMs,
        endMs: s.endMs,
        text: s.text,
      })),
    });
  }
  const stored = await tx.transcriptSegment.findMany({ where: { transcriptId: transcript.id } });

  for (const [template, content] of Object.entries(m.summaries) as [SummaryTemplate, unknown][]) {
    // Written for the seed, not generated: no model, not the sample fallback.
    const data = { status: "READY" as const, content: summaryContentSchemas[template].parse(content), isSample: false, model: null, error: null };
    await tx.summary.upsert({
      where: { meetingId_template: { meetingId, template } },
      create: { meetingId, template, ...data },
      update: data,
    });
  }

  for (const [position, item] of m.actionItems.entries()) {
    const data = {
      assigneeId: item.assignee ? speakerId(item.assignee) : null,
      timestampMs: item.timestampMs,
      dueDate: item.dueDate,
      completed: item.completed,
      position,
    };
    const found = await tx.actionItem.findFirst({ where: { meetingId, description: item.description } });
    if (found) await tx.actionItem.update({ where: { id: found.id }, data });
    else await tx.actionItem.create({ data: { meetingId, description: item.description, ...data } });
  }

  for (const a of m.annotations) {
    const segment = stored.find((s) => s.startMs === a.segmentStartMs);
    const offset = segment?.text.indexOf(a.quote) ?? -1;
    if (!segment || offset < 0) throw new Error(`Quote not found at ${a.segmentStartMs}ms: "${a.quote}"`);
    const data = {
      startMs: segment.startMs,
      endMs: segment.endMs,
      startSegmentId: segment.id,
      startOffset: offset,
      endSegmentId: segment.id,
      endOffset: offset + a.quote.length,
      note: a.note,
    };
    const found = await tx.annotation.findFirst({ where: { meetingId, type: a.type, quote: a.quote } });
    if (found) await tx.annotation.update({ where: { id: found.id }, data });
    else await tx.annotation.create({ data: { meetingId, type: a.type, quote: a.quote, ...data } });
  }

  for (const [position, section] of m.timeline.entries()) {
    await tx.timelineSection.upsert({
      where: { meetingId_position: { meetingId, position } },
      create: { meetingId, position, ...section },
      update: section,
    });
  }
  return meetingId;
}

// Re-reads everything from the database and checks it against the seed data.
async function verify(meetingId: string, m: SeedMeeting, segments: ParsedSegment[]) {
  const meeting = await db().meeting.findUniqueOrThrow({
    where: { id: meetingId },
    include: {
      folder: true,
      tags: { include: { tag: true } },
      speakers: true,
      transcript: { include: { segments: { orderBy: { position: "asc" }, include: { speaker: true } } } },
      summaries: true,
      actionItems: { include: { assignee: true } },
      annotations: true,
      timelineSections: true,
      shares: true,
    },
  });
  const fail = (msg: string) => {
    throw new Error(`[${m.title}] ${msg}`);
  };
  const segs = meeting.transcript?.segments ?? [];
  const speakerIds = new Set(meeting.speakers.map((s) => s.id));

  if (meeting.videoKey !== m.videoKey) fail("video key changed");
  if (segs.length !== segments.length) fail(`expected ${segments.length} segments, found ${segs.length}`);
  segs.forEach((s, i) => {
    const want = segments[i];
    if (s.text !== want.text || s.startMs !== want.startMs || s.speaker?.name !== want.speaker) fail(`segment ${i} differs`);
    if (!s.speakerId || !speakerIds.has(s.speakerId)) fail(`segment ${i} speaker is not this meeting's`);
  });
  if (meeting.summaries.length !== 5) fail(`expected 5 summaries, found ${meeting.summaries.length}`);
  for (const s of meeting.summaries) summaryContentSchemas[s.template].parse(s.content);
  for (const a of meeting.actionItems) {
    if (a.assigneeId && !speakerIds.has(a.assigneeId)) fail(`action item assignee is not this meeting's`);
  }
  for (const a of meeting.annotations) {
    const seg = segs.find((s) => s.id === a.startSegmentId);
    if (!seg || seg.id !== a.endSegmentId) fail(`annotation "${a.quote}" is not linked to a segment`);
    if (seg!.text.slice(a.startOffset!, a.endOffset!) !== a.quote) fail(`annotation offsets don't match "${a.quote}"`);
  }
  if (meeting.timelineSections.length > 4) fail("more than 4 timeline sections");
  if (meeting.timelineSections.some((t) => t.endMs > m.durationMs)) fail("timeline section past the end of the video");

  return {
    title: meeting.title,
    videoKey: meeting.videoKey,
    duration: `${Math.floor(m.durationMs / 60_000)}m ${Math.round((m.durationMs % 60_000) / 1000)}s`,
    folder: meeting.folder?.name,
    tags: meeting.tags.map((t) => t.tag.name).join(", "),
    speakers: meeting.speakers.length,
    segments: segs.length,
    summaries: meeting.summaries.length,
    actionItems: meeting.actionItems.length,
    annotations: meeting.annotations.length,
    timeline: meeting.timelineSections.length,
    shares: meeting.shares.length,
  };
}

const parsed = seedMeetings.map((m) => ({ m, segments: parse(m) }));
const ids = await db().$transaction(
  async (tx) => {
    const out: string[] = [];
    for (const { m, segments } of parsed) out.push(await seedMeeting(tx, m, segments));
    return out;
  },
  { timeout: 120_000 },
);
console.table(await Promise.all(parsed.map(({ m, segments }, i) => verify(ids[i], m, segments))));
console.log("Seed verified.");
await db().$disconnect();
