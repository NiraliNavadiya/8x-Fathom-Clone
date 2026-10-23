import { describe, expect, it } from "vitest";
import { summaryToText, transcriptToText } from "./copy-text";

describe("copy text", () => {
  it("copies the transcript as speaker lines, exactly as stored", () => {
    const transcript = {
      id: "t", language: "en", text: "", updatedAt: "",
      segments: [
        { id: "1", position: 0, speaker: "Nirali", startMs: 21_000, endMs: 33_000, text: "Hi everyone.  I'm Nirali." },
        { id: "2", position: 1, speaker: null, startMs: 33_000, endMs: 40_000, text: "Unattributed line." },
      ],
    };
    expect(transcriptToText(transcript)).toBe("Nirali: Hi everyone.  I'm Nirali.\nUnattributed line.");
  });

  it("formats each template as readable plain text", () => {
    expect(
      summaryToText("SUMMARY", { tldr: "Launch Friday.", keyPoints: [{ text: "Payments are the risk.", timestampMs: 60_000 }] }),
    ).toBe("TL;DR: Launch Friday.\n\nKey points:\n- Payments are the risk.");
    const project = summaryToText("PROJECT_MEETING", {
      goal: "Ship it", status: null, nextMilestone: null,
      workstreams: [{ name: "Landing page", owner: null, due: "Wednesday", timestampMs: null }],
      risks: [],
    });
    expect(project).toContain("Status: Not stated");
    expect(project).toContain("- Landing page (owner: unassigned, due Wednesday)");
    expect(project).not.toContain("Risks:"); // empty sections are left out
  });
});
