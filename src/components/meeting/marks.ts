import type { AnnotationType } from "@/generated/prisma/enums";
import type { AnnotationView, TranscriptSegment } from "@/lib/meetings";

export type Mark = { start: number; end: number; type: AnnotationType };

/** Character ranges per segment covered by each annotation (selections may span segments). */
export function marksBySegment(segments: TranscriptSegment[], annotations: AnnotationView[]) {
  const index = new Map(segments.map((s, i) => [s.id, i]));
  const result = new Map<string, Mark[]>();
  for (const a of annotations) {
    const from = a.startSegmentId ? index.get(a.startSegmentId) : undefined;
    const to = a.endSegmentId ? index.get(a.endSegmentId) : undefined;
    if (from === undefined || to === undefined || a.startOffset === null || a.endOffset === null) continue;
    for (let i = from; i <= to; i++) {
      const s = segments[i];
      const mark = {
        start: i === from ? a.startOffset : 0,
        end: Math.min(i === to ? a.endOffset : s.text.length, s.text.length),
        type: a.type,
      };
      if (mark.end > mark.start) result.set(s.id, [...(result.get(s.id) ?? []), mark]);
    }
  }
  return result;
}

/**
 * Splits text at every mark boundary. Each piece carries the type of the last
 * mark covering it, or null. Joining the pieces gives back the text unchanged.
 */
export function splitByMarks(text: string, marks: Mark[]) {
  const cuts = [...new Set([0, text.length, ...marks.flatMap((m) => [m.start, m.end])])]
    .filter((c) => c >= 0 && c <= text.length)
    .sort((a, b) => a - b);
  return cuts.slice(0, -1).map((from, i) => {
    const to = cuts[i + 1];
    const mark = marks.findLast((m) => m.start <= from && m.end >= to);
    return { from, text: text.slice(from, to), type: mark?.type ?? null };
  });
}
