import "server-only";

import { z } from "zod";
import { db } from "@/lib/db";
import type { MeetingStatus, Prisma } from "@/generated/prisma/client";

export const segmentSchema = z
  .object({
    speaker: z.string().trim().min(1).max(200),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative(),
    text: z.string(),
  })
  .refine((s) => s.endMs >= s.startMs, {
    message: "endMs must not be before startMs",
    path: ["endMs"],
  });

export type TranscriptSegmentInput = z.infer<typeof segmentSchema>;

export const createMeetingSchema = z.object({
  title: z.string().trim().min(1).max(300),
  recordedAt: z.coerce.date().optional(),
  videoKey: z.string().min(1).max(1024),
  videoContentType: z.string().regex(/^video\//, "must be a video/* content type"),
  videoSizeBytes: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative().optional(),
});

export const saveTranscriptSchema = z.object({
  language: z.string().trim().min(2).max(16).default("en"),
  segments: z.array(segmentSchema).min(1),
  // Derived from the segments when omitted.
  text: z.string().optional(),
});

export type CreateMeetingInput = z.input<typeof createMeetingSchema>;
export type SaveTranscriptInput = z.input<typeof saveTranscriptSchema>;

// JSON-safe shapes: BigInt and Date don't survive Response.json() as-is.
export type MeetingSummary = {
  id: string;
  title: string;
  description: string | null;
  status: MeetingStatus;
  recordedAt: string | null;
  createdAt: string;
  videoContentType: string;
  videoSizeBytes: number;
  durationMs: number | null;
  hasTranscript: boolean;
  speakers: string[];
  tags: { id: string; name: string; color: string | null }[];
  folder: { id: string; name: string } | null;
};

export type TranscriptSegment = {
  id: string;
  position: number;
  speaker: string | null;
  startMs: number;
  endMs: number;
  text: string;
};

export type TranscriptDetail = {
  id: string;
  language: string;
  text: string;
  segments: TranscriptSegment[];
  updatedAt: string;
};

export type MeetingDetail = MeetingSummary & { transcript: TranscriptDetail | null };

// Everything a meeting tile shows.
const summaryInclude = {
  transcript: { select: { id: true } },
  speakers: { select: { name: true }, orderBy: { name: "asc" } },
  tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
  folder: { select: { id: true, name: true } },
} satisfies Prisma.MeetingInclude;

type MeetingWithSummary = Prisma.MeetingGetPayload<{ include: typeof summaryInclude }>;

function toSummary(meeting: MeetingWithSummary): MeetingSummary {
  return {
    id: meeting.id,
    title: meeting.title,
    description: meeting.description,
    status: meeting.status,
    recordedAt: meeting.recordedAt?.toISOString() ?? null,
    createdAt: meeting.createdAt.toISOString(),
    videoContentType: meeting.videoContentType,
    videoSizeBytes: Number(meeting.videoSizeBytes),
    durationMs: meeting.durationMs,
    hasTranscript: meeting.transcript !== null,
    speakers: meeting.speakers.map((s) => s.name),
    tags: meeting.tags.map((t) => t.tag).sort((a, b) => a.name.localeCompare(b.name)),
    folder: meeting.folder,
  };
}

const transcriptInclude = {
  segments: { orderBy: { position: "asc" }, include: { speaker: { select: { name: true } } } },
} satisfies Prisma.TranscriptInclude;

type TranscriptWithSegments = Prisma.TranscriptGetPayload<{ include: typeof transcriptInclude }>;

function toTranscript(transcript: TranscriptWithSegments): TranscriptDetail {
  return {
    id: transcript.id,
    language: transcript.language,
    text: transcript.text,
    segments: transcript.segments.map((s) => ({
      id: s.id,
      position: s.position,
      speaker: s.speaker?.name ?? null,
      startMs: s.startMs,
      endMs: s.endMs,
      text: s.text,
    })),
    updatedAt: transcript.updatedAt.toISOString(),
  };
}

const uuid = z.uuid();

export async function createMeeting(input: CreateMeetingInput): Promise<MeetingSummary> {
  const data = createMeetingSchema.parse(input);
  const meeting = await db().meeting.create({
    data: { ...data, videoSizeBytes: BigInt(data.videoSizeBytes) },
    include: summaryInclude,
  });
  return toSummary(meeting);
}

// Idempotent by video key, so importing the same object twice keeps one row.
export async function upsertMeetingByVideoKey(input: CreateMeetingInput): Promise<MeetingSummary> {
  const data = createMeetingSchema.parse(input);
  const fields = { ...data, videoSizeBytes: BigInt(data.videoSizeBytes) };
  const meeting = await db().meeting.upsert({
    where: { videoKey: data.videoKey },
    create: fields,
    update: { videoContentType: fields.videoContentType, videoSizeBytes: fields.videoSizeBytes },
    include: summaryInclude,
  });
  return toSummary(meeting);
}

export async function listMeetings(filter: { folderId?: string } = {}): Promise<MeetingSummary[]> {
  const meetings = await db().meeting.findMany({
    where: { isDeleted: false, folderId: filter.folderId },
    orderBy: [{ recordedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    include: summaryInclude,
  });
  return meetings.map(toSummary);
}

export async function getMeeting(id: string): Promise<MeetingDetail | null> {
  if (!uuid.safeParse(id).success) return null;
  const meeting = await db().meeting.findFirst({
    where: { id, isDeleted: false },
    include: { ...summaryInclude, transcript: { include: transcriptInclude } },
  });
  if (!meeting) return null;
  return {
    ...toSummary(meeting),
    transcript: meeting.transcript ? toTranscript(meeting.transcript) : null,
  };
}

export async function getMeetingVideoKey(id: string): Promise<string | null> {
  if (!uuid.safeParse(id).success) return null;
  const meeting = await db().meeting.findFirst({ where: { id, isDeleted: false }, select: { videoKey: true } });
  return meeting?.videoKey ?? null;
}

// Creates or replaces the meeting's transcript and its segments, adds any new
// speakers, and marks the meeting READY.
// Returns null when the meeting does not exist.
export async function saveTranscript(
  meetingId: string,
  input: SaveTranscriptInput,
): Promise<TranscriptDetail | null> {
  if (!uuid.safeParse(meetingId).success) return null;
  const data = saveTranscriptSchema.parse(input);
  const text = data.text ?? data.segments.map((s) => `${s.speaker}: ${s.text}`).join("\n");

  return db().$transaction(async (tx) => {
    const meeting = await tx.meeting.findUnique({ where: { id: meetingId }, select: { id: true } });
    if (!meeting) return null;

    const names = [...new Set(data.segments.map((s) => s.speaker))];
    await tx.meetingSpeaker.createMany({
      data: names.map((name) => ({ meetingId, name })),
      skipDuplicates: true,
    });
    const speakers = await tx.meetingSpeaker.findMany({
      where: { meetingId, name: { in: names } },
      select: { id: true, name: true },
    });
    const speakerIds = new Map(speakers.map((s) => [s.name, s.id]));

    const fields = { language: data.language, text };
    const { id: transcriptId } = await tx.transcript.upsert({
      where: { meetingId },
      create: { meetingId, ...fields },
      update: fields,
      select: { id: true },
    });
    await tx.transcriptSegment.deleteMany({ where: { transcriptId } });
    await tx.transcriptSegment.createMany({
      data: data.segments.map((s, position) => ({
        transcriptId,
        position,
        speakerId: speakerIds.get(s.speaker),
        startMs: s.startMs,
        endMs: s.endMs,
        text: s.text,
      })),
    });
    await tx.meeting.update({ where: { id: meetingId }, data: { status: "READY" } });

    const transcript = await tx.transcript.findUniqueOrThrow({
      where: { id: transcriptId },
      include: transcriptInclude,
    });
    return toTranscript(transcript);
  });
}

// Soft delete: the row and its video stay, and the meeting is hidden everywhere.
export async function deleteMeeting(id: string): Promise<boolean> {
  if (!uuid.safeParse(id).success) return false;
  const { count } = await db().meeting.updateMany({ where: { id, isDeleted: false }, data: { isDeleted: true } });
  return count > 0;
}

export async function restoreDeletedMeetings(): Promise<number> {
  const { count } = await db().meeting.updateMany({ where: { isDeleted: true }, data: { isDeleted: false } });
  return count;
}

export async function moveMeetingToFolder(id: string, folderId: string | null): Promise<boolean> {
  if (!uuid.safeParse(id).success || (folderId !== null && !uuid.safeParse(folderId).success)) return false;
  const { count } = await db().meeting.updateMany({ where: { id, isDeleted: false }, data: { folderId } });
  return count > 0;
}
