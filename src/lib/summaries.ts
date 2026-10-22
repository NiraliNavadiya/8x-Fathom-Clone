import { z } from "zod";
import type { SummaryTemplate } from "@/generated/prisma/enums";

// The JSON stored in `summaries.content`, one structure per template.
// Times are milliseconds into the video, or null when not tied to a moment.

const timestampMs = z.number().int().nonnegative().nullable();
const point = z.object({ text: z.string().min(1), timestampMs });

export const summaryContentSchemas = {
  AI_NOTES: z.object({
    overview: z.string().min(1),
    sections: z.array(z.object({ heading: z.string().min(1), points: z.array(point).min(1) })).min(1),
  }),
  MEETING_MINUTES: z.object({
    attendees: z.array(z.string().min(1)),
    agenda: z.array(z.string().min(1)),
    discussion: z.array(z.object({ topic: z.string().min(1), notes: z.string().min(1), timestampMs })),
    decisions: z.array(point),
    nextSteps: z.array(point),
  }),
  SUMMARY: z.object({
    tldr: z.string().min(1),
    keyPoints: z.array(point).min(1),
  }),
  CUSTOMER_FEEDBACK: z.object({
    context: z.string().min(1),
    feedback: z.array(
      z.object({
        speaker: z.string().nullable(),
        sentiment: z.enum(["positive", "negative", "neutral", "mixed"]),
        text: z.string().min(1),
        timestampMs,
      }),
    ),
    painPoints: z.array(point),
    requests: z.array(point),
  }),
  PROJECT_MEETING: z.object({
    goal: z.string().min(1),
    // Null when the meeting doesn't establish a status.
    status: z.enum(["on_track", "at_risk", "off_track"]).nullable(),
    workstreams: z.array(
      z.object({
        name: z.string().min(1),
        owner: z.string().nullable(),
        due: z.string().nullable(),
        timestampMs,
      }),
    ),
    risks: z.array(z.object({ text: z.string().min(1), mitigation: z.string().nullable(), timestampMs })),
    nextMilestone: point.nullable(),
  }),
} satisfies Record<SummaryTemplate, z.ZodType>;

export type SummaryContent<T extends SummaryTemplate> = z.infer<(typeof summaryContentSchemas)[T]>;
