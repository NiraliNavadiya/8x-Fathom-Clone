import type { SummaryTemplate } from "@/generated/prisma/enums";
import type { TranscriptDetail } from "@/lib/meetings";
import type { SummaryContent } from "@/lib/summaries";

// Plain-text versions of the summary and transcript for the copy buttons.
// Timestamps are left out, matching what the page shows.

export function transcriptToText(transcript: TranscriptDetail): string {
  return transcript.segments.map((s) => (s.speaker ? `${s.speaker}: ${s.text}` : s.text)).join("\n");
}

const bullets = (items: { text: string }[]) => items.map((i) => `- ${i.text}`);
const section = (title: string, lines: string[]) => (lines.length ? [`${title}:`, ...lines, ""] : []);

export function summaryToText(template: SummaryTemplate, content: unknown): string {
  const lines: string[] = [];
  switch (template) {
    case "AI_NOTES": {
      const c = content as SummaryContent<"AI_NOTES">;
      lines.push(c.overview, "");
      for (const s of c.sections) lines.push(...section(s.heading, bullets(s.points)));
      break;
    }
    case "MEETING_MINUTES": {
      const c = content as SummaryContent<"MEETING_MINUTES">;
      if (c.attendees.length) lines.push(`Attendees: ${c.attendees.join(", ")}`, "");
      lines.push(...section("Agenda", c.agenda.map((a, i) => `${i + 1}. ${a}`)));
      lines.push(...section("Discussion", c.discussion.map((d) => `- ${d.topic}: ${d.notes}`)));
      lines.push(...section("Decisions", bullets(c.decisions)));
      lines.push(...section("Next steps", bullets(c.nextSteps)));
      break;
    }
    case "SUMMARY": {
      const c = content as SummaryContent<"SUMMARY">;
      lines.push(`TL;DR: ${c.tldr}`, "", ...section("Key points", bullets(c.keyPoints)));
      break;
    }
    case "CUSTOMER_FEEDBACK": {
      const c = content as SummaryContent<"CUSTOMER_FEEDBACK">;
      lines.push(c.context, "");
      lines.push(...section("Feedback", c.feedback.map((f) => `- ${f.speaker ?? "Unknown speaker"} (${f.sentiment}): ${f.text}`)));
      lines.push(...section("Pain points", bullets(c.painPoints)));
      lines.push(...section("Requests", bullets(c.requests)));
      break;
    }
    case "PROJECT_MEETING": {
      const c = content as SummaryContent<"PROJECT_MEETING">;
      const status = { on_track: "On track", at_risk: "At risk", off_track: "Off track" } as const;
      lines.push(`Goal: ${c.goal}`, `Status: ${c.status ? status[c.status] : "Not stated"}`, "");
      lines.push(
        ...section(
          "Workstreams",
          c.workstreams.map((w) => `- ${w.name} (owner: ${w.owner ?? "unassigned"}${w.due ? `, due ${w.due}` : ""})`),
        ),
      );
      lines.push(...section("Risks", c.risks.map((r) => `- ${r.text}${r.mitigation ? ` Mitigation: ${r.mitigation}` : ""}`)));
      if (c.nextMilestone) lines.push(`Next milestone: ${c.nextMilestone.text}`);
      break;
    }
  }
  return lines.join("\n").trim();
}
