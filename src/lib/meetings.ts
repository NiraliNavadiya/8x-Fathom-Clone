import "server-only";

import { z } from "zod";
import { db } from "@/lib/db";
import type { Meeting, MeetingStatus, Transcript } from "@/generated/prisma/client";

export const segmentSchema = z
  .object({
    speaker: z.string().trim().min(1).max(200),
    startSeconds: z.number().nonnegative(),
    endSeconds: z.number().nonnegative(),
    text: z.string(),
  })
  .refine((s) => s.endSeconds >= s.startSeconds, {
    message: "endSeconds must not be before startSeconds",
    path: ["endSeconds"],
  });

export type TranscriptSegment = z.infer<typeof segmentSchema>;

export const createMeetingSchema = z.object({
  title: z.string().trim().min(1).max(300),
  recordedAt: z.coerce.date().optional(),
  videoKey: z.string().min(1).max(1024),
  videoContentType: z.string().regex(/^video\//, "must be a video/* content type"),
  videoSizeBytes: z.number().int().nonnegative(),
  durationSeconds: z.number().int().nonnegative().optional(),
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
  status: MeetingStatus;
  recordedAt: string | null;
  createdAt: string;
  videoContentType: string;
  videoSizeBytes: number;
  durationSeconds: number | null;
  hasTranscript: boolean;
};

export type TranscriptDetail = {
  id: string;
  language: string;
  text: string;
  segments: TranscriptSegment[];
  updatedAt: string;
};

export type MeetingDetail = MeetingSummary & { transcript: TranscriptDetail | null };

function toSummary(meeting: Meeting, hasTranscript: boolean): MeetingSummary {
  return {
    id: meeting.id,
    title: meeting.title,
    status: meeting.status,
    recordedAt: meeting.recordedAt?.toISOString() ?? null,
    createdAt: meeting.createdAt.toISOString(),
    videoContentType: meeting.videoContentType,
    videoSizeBytes: Number(meeting.videoSizeBytes),
    durationSeconds: meeting.durationSeconds,
    hasTranscript,
  };
}

function toTranscript(transcript: Transcript): TranscriptDetail {
  return {
    id: transcript.id,
    language: transcript.language,
    text: transcript.text,
    // Validated on write, so the stored JSON already has this shape.
    segments: transcript.segments as TranscriptSegment[],
    updatedAt: transcript.updatedAt.toISOString(),
  };
}

const uuid = z.uuid();

export async function createMeeting(input: CreateMeetingInput): Promise<MeetingSummary> {
  const data = createMeetingSchema.parse(input);
  const meeting = await db().meeting.create({
    data: { ...data, videoSizeBytes: BigInt(data.videoSizeBytes) },
  });
  return toSummary(meeting, false);
}

// Idempotent by video key, so importing the same object twice keeps one row.
export async function upsertMeetingByVideoKey(input: CreateMeetingInput): Promise<MeetingSummary> {
  const data = createMeetingSchema.parse(input);
  const fields = { ...data, videoSizeBytes: BigInt(data.videoSizeBytes) };
  const meeting = await db().meeting.upsert({
    where: { videoKey: data.videoKey },
    create: fields,
    update: { videoContentType: fields.videoContentType, videoSizeBytes: fields.videoSizeBytes },
    include: { transcript: { select: { id: true } } },
  });
  return toSummary(meeting, meeting.transcript !== null);
}

export async function listMeetings(): Promise<MeetingSummary[]> {
  const meetings = await db().meeting.findMany({
    orderBy: { createdAt: "desc" },
    include: { transcript: { select: { id: true } } },
  });
  return meetings.map((m) => toSummary(m, m.transcript !== null));
}

export async function getMeeting(id: string): Promise<MeetingDetail | null> {
  if (!uuid.safeParse(id).success) return null;
  const meeting = await db().meeting.findUnique({ where: { id }, include: { transcript: true } });
  if (!meeting) return null;
  return {
    ...toSummary(meeting, meeting.transcript !== null),
    transcript: meeting.transcript ? toTranscript(meeting.transcript) : null,
  };
}

export async function getMeetingVideoKey(id: string): Promise<string | null> {
  if (!uuid.safeParse(id).success) return null;
  const meeting = await db().meeting.findUnique({ where: { id }, select: { videoKey: true } });
  return meeting?.videoKey ?? null;
}

// Creates or replaces the meeting's transcript and marks the meeting READY.
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

    const fields = { language: data.language, text, segments: data.segments };
    const transcript = await tx.transcript.upsert({
      where: { meetingId },
      create: { meetingId, ...fields },
      update: fields,
    });
    await tx.meeting.update({ where: { id: meetingId }, data: { status: "READY" } });
    return toTranscript(transcript);
  });
}

export async function deleteMeeting(id: string): Promise<boolean> {
  if (!uuid.safeParse(id).success) return false;
  const { count } = await db().meeting.deleteMany({ where: { id } });
  return count > 0;
}
