import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { db } from "@/lib/db";
import { geminiEnv } from "@/lib/env";
import { formatTimestamp } from "@/lib/format";

// Ask Meetly: searches every meeting's transcript, then asks Gemini to answer
// from the matching passages plus each meeting's summary and action items.
// Without GEMINI_API_KEY it returns the passages alone.

export const askRequestSchema = z.object({
  // Limits the search to one meeting (the meeting page's Ask Meetly tab).
  meetingId: z.uuid().optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(20)
    .refine((m) => m.at(-1)?.role === "user", "The last message must be from the user"),
});

export type AskRequest = z.infer<typeof askRequestSchema>;

export type Citation = {
  meetingId: string;
  meetingTitle: string;
  startMs: number;
  speaker: string | null;
  text: string;
};

export type AskResponse = {
  answer: string | null; // null when there's no AI answer; citations are then raw passages
  citations: Citation[];
  // Why there's no written answer: AI isn't configured, or it failed this time.
  fallback?: "no-key" | "ai-unavailable";
};

const PASSAGE_LIMIT = 12;

// Matches any meaningful word, ranked by how many match. Speaker names are
// searchable too, so "what did James say" finds James's segments.
export async function searchTranscripts(
  query: string,
  { limit = PASSAGE_LIMIT, meetingId }: { limit?: number; meetingId?: string } = {},
): Promise<Citation[]> {
  const words = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])];
  if (words.length === 0) return [];
  const tsquery = words.join(" | ");
  // A speaker-name match (weight A) outranks a mention in the text (weight D).
  return db().$queryRaw<Citation[]>`
    WITH q AS (SELECT to_tsquery('english', ${tsquery}) AS q),
    docs AS (
      SELECT s.*, sp.name AS speaker,
             setweight(to_tsvector('english', coalesce(sp.name, '')), 'A') ||
             setweight(to_tsvector('english', s.text), 'D') AS doc
      FROM transcript_segments s
      LEFT JOIN meeting_speakers sp ON sp.id = s.speaker_id
    )
    SELECT m.id AS "meetingId", m.title AS "meetingTitle", d.start_ms AS "startMs", d.speaker, d.text
    FROM docs d
    JOIN transcripts t ON t.id = d.transcript_id
    JOIN meetings m ON m.id = t.meeting_id AND NOT m.is_deleted
      AND (${meetingId ?? null}::uuid IS NULL OR m.id = ${meetingId ?? null}::uuid), q
    WHERE d.doc @@ q.q
    ORDER BY ts_rank(d.doc, q.q) DESC, d.start_ms
    LIMIT ${limit}`;
}

// Per-meeting background so general questions ("summarize my last call") work.
async function meetingOverviews(meetingId?: string) {
  const meetings = await db().meeting.findMany({
    where: { isDeleted: false, id: meetingId },
    orderBy: [{ recordedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      recordedAt: true,
      createdAt: true,
      durationMs: true,
      speakers: { select: { name: true } },
      summaries: { where: { template: "SUMMARY", status: "READY" }, select: { content: true } },
      actionItems: {
        orderBy: { position: "asc" },
        select: { description: true, timestampMs: true, completed: true, assignee: { select: { name: true } } },
      },
    },
  });
  return meetings.map((m) => ({
    meetingId: m.id,
    title: m.title,
    date: (m.recordedAt ?? m.createdAt).toISOString().slice(0, 10),
    durationMs: m.durationMs,
    speakers: m.speakers.map((s) => s.name),
    summary: m.summaries[0]?.content ?? null,
    actionItems: m.actionItems.map((a) => ({
      description: a.description,
      assignee: a.assignee?.name ?? null,
      timestampMs: a.timestampMs,
      completed: a.completed,
    })),
  }));
}

const answerSchema = z.object({
  answer: z.string(),
  citations: z.array(z.int()),
});

const SYSTEM_PROMPT = `You are Meetly's assistant. Answer questions about the user's recorded meetings in a friendly chat tone.

Use only the meeting overviews and transcript passages provided. If they don't contain the answer, say so plainly; don't guess.
Keep answers short: a few sentences or a brief list. Write plain text: use "- " for bullets and no other markdown. Mention which meeting something came from.
In "citations", list the numbers of the passages that support your answer, most relevant first (at most 4). Use [] when no passage applies.`;

export async function askMeetly(request: AskRequest): Promise<AskResponse> {
  const { messages, meetingId } = askRequestSchema.parse(request);
  // Include the previous question so follow-ups like "and who owns it?" still match.
  const recentQuestions = messages.filter((m) => m.role === "user").slice(-2);
  const passages = await searchTranscripts(recentQuestions.map((m) => m.content).join(" "), { meetingId });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return { answer: null, citations: passages.slice(0, 5), fallback: "no-key" };

  const { GEMINI_MODEL } = geminiEnv();
  const context = JSON.stringify({
    meetings: await meetingOverviews(meetingId),
    passages: passages.map((p, i) => ({
      n: i + 1,
      meeting: p.meetingTitle,
      at: formatTimestamp(p.startMs),
      speaker: p.speaker,
      text: p.text,
    })),
  });

  // If Gemini is down or overloaded, still show the matching passages.
  try {
    const response = await new GoogleGenAI({ apiKey: key }).models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { role: "user", parts: [{ text: `Meeting data (JSON):\n${context}` }] },
        { role: "model", parts: [{ text: "Understood. I'll answer from this meeting data only." }] },
        ...messages.map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] })),
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(answerSchema),
      },
    });

    const parsed = answerSchema.parse(JSON.parse(response.text ?? ""));
    const citations = [...new Set(parsed.citations)]
      .map((n) => passages[n - 1])
      .filter((p): p is Citation => p !== undefined);
    return { answer: parsed.answer, citations };
  } catch (error) {
    console.error("Gemini request failed; returning transcript passages", error);
    return { answer: null, citations: passages.slice(0, 5), fallback: "ai-unavailable" };
  }
}
