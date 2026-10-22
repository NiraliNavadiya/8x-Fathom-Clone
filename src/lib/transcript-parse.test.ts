import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBlockTranscript, parseInlineTranscript } from "./transcript-parse";

const fixture = (name: string) => readFileSync(`prisma/seed/transcripts/${name}`, "utf8");

describe("parseInlineTranscript", () => {
  it("reads `Name : m.ss - text` lines and skips the header", () => {
    const segments = parseInlineTranscript(fixture("fathom-test-meeting-4.txt"), 134_242);
    expect(segments).toHaveLength(8);
    expect(segments[0]).toEqual({
      speaker: "Nirali",
      startMs: 21_000,
      endMs: 33_000,
      text: "Hi everyone. I'm Nirali. So this meeting is to discuss the product launch. So today we will finalize our plan for launching the new product next Friday.",
    });
    expect(segments[3].startMs).toBe(60_000); // "1.0" is 1:00
    expect(segments.at(-1)).toMatchObject({ startMs: 112_000, endMs: 134_242 });
  });
});

describe("parseBlockTranscript", () => {
  const segments = parseBlockTranscript(fixture("community-board-seats.txt"), 3_088_917);

  it("keeps the speaker across continuation timestamps", () => {
    expect(segments.slice(0, 4).map((s) => [s.speaker, s.startMs])).toEqual([
      ["Andrew", 2_000],
      ["Andrew", 28_000],
      ["Andrew", 50_000],
      ["James Heilman", 79_000],
    ]);
  });

  it("is ordered and ends at the video's end", () => {
    for (const [i, s] of segments.entries()) {
      expect(s.endMs).toBe(segments[i + 1]?.startMs ?? 3_088_917);
    }
    expect(segments.at(-1)).toMatchObject({ speaker: "Andrew", startMs: 3_082_000, text: "Zero. Okay, good to know." });
  });

  it("rejects a timestamp without text", () => {
    expect(() => parseBlockTranscript("Transcript - x\nA\n0:01", 5_000)).toThrow();
  });
});
