import type { TranscriptSegment } from "@/lib/meetings";

export const MAX_CHAPTERS = 4;

export type Chapter = { id: string; title: string; startMs: number; endMs: number };

/**
 * The player's chapters: the meeting's stored timeline sections or, when it
 * has none, up to four equal stretches of time, each starting at a transcript
 * segment and labelled with that segment's opening words. Never more than four.
 */
export function chaptersFor(sections: Chapter[], segments: TranscriptSegment[], durationMs: number): Chapter[] {
  if (sections.length > 0) return sections.slice(0, MAX_CHAPTERS);
  if (segments.length === 0 || durationMs <= 0) return [];
  const starts: TranscriptSegment[] = [];
  for (let i = 0; i < MAX_CHAPTERS; i++) {
    const target = (durationMs / MAX_CHAPTERS) * i;
    const segment = segments.find((s) => s.startMs >= target) ?? segments.at(-1)!;
    if (!starts.includes(segment)) starts.push(segment);
  }
  return starts.map((s, i) => {
    const words = s.text.split(/\s+/);
    return {
      id: s.id,
      title: words.slice(0, 6).join(" ") + (words.length > 6 ? "…" : ""),
      startMs: i === 0 ? 0 : s.startMs,
      endMs: starts[i + 1]?.startMs ?? durationMs,
    };
  });
}
