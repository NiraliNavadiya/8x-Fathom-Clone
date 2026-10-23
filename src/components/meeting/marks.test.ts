import { describe, expect, it } from "vitest";
import { chaptersFor } from "./chapters";
import { marksBySegment, splitByMarks } from "./marks";

const seg = (id: string, startMs: number, endMs: number, text: string) => ({
  id, position: 0, speaker: "A", startMs, endMs, text,
});
const annotation = (o: Partial<Parameters<typeof marksBySegment>[1][number]>) => ({
  id: "a", type: "HIGHLIGHT" as const, startMs: 0, endMs: 0, quote: "", note: null,
  startSegmentId: null, startOffset: null, endSegmentId: null, endOffset: null, ...o,
});

describe("splitByMarks", () => {
  it("keeps the text intact and marks the covered range", () => {
    const pieces = splitByMarks("We ship on Friday.", [{ start: 3, end: 7, type: "NOTE" }]);
    expect(pieces.map((p) => p.text).join("")).toBe("We ship on Friday.");
    expect(pieces.filter((p) => p.type).map((p) => [p.text, p.type])).toEqual([["ship", "NOTE"]]);
  });

  it("lets the later of two overlapping marks win", () => {
    const pieces = splitByMarks("abcdef", [
      { start: 0, end: 4, type: "HIGHLIGHT" },
      { start: 2, end: 6, type: "NEEDS_REVIEW" },
    ]);
    expect(pieces.map((p) => [p.text, p.type])).toEqual([
      ["ab", "HIGHLIGHT"],
      ["cd", "NEEDS_REVIEW"],
      ["ef", "NEEDS_REVIEW"],
    ]);
  });
});

describe("marksBySegment", () => {
  const segments = [seg("s0", 0, 5, "Hello there."), seg("s1", 5, 9, "Middle bit."), seg("s2", 9, 12, "The end.")];

  it("spreads a cross-segment selection over every segment it covers", () => {
    const marks = marksBySegment(segments, [
      annotation({ startSegmentId: "s0", startOffset: 6, endSegmentId: "s2", endOffset: 3 }),
    ]);
    expect(marks.get("s0")).toEqual([{ start: 6, end: 12, type: "HIGHLIGHT" }]);
    expect(marks.get("s1")).toEqual([{ start: 0, end: 11, type: "HIGHLIGHT" }]);
    expect(marks.get("s2")).toEqual([{ start: 0, end: 3, type: "HIGHLIGHT" }]);
  });

  it("skips annotations without a usable position", () => {
    const marks = marksBySegment(segments, [
      annotation({}), // no segment link
      annotation({ startSegmentId: "gone", startOffset: 0, endSegmentId: "gone", endOffset: 3 }), // replaced transcript
    ]);
    expect(marks.size).toBe(0);
  });
});

describe("chaptersFor", () => {
  it("uses stored sections, never more than four", () => {
    const sections = Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, title: `S${i}`, startMs: i, endMs: i + 1 }));
    expect(chaptersFor(sections, [], 10).map((c) => c.id)).toEqual(["c0", "c1", "c2", "c3"]);
  });

  it("derives up to four sections from the transcript, starting at real segments", () => {
    const segments = Array.from({ length: 10 }, (_, i) => seg(`s${i}`, i * 10_000, (i + 1) * 10_000, `Line ${i} one two three four five six seven`));
    const chapters = chaptersFor([], segments, 100_000);
    expect(chapters).toHaveLength(4);
    expect(chapters.map((c) => [c.startMs, c.endMs])).toEqual([
      [0, 30_000],
      [30_000, 50_000],
      [50_000, 80_000],
      [80_000, 100_000],
    ]);
    expect(chapters[1].title).toBe("Line 3 one two three four…");
  });

  it("returns nothing without sections or transcript", () => {
    expect(chaptersFor([], [], 100_000)).toEqual([]);
  });
});
