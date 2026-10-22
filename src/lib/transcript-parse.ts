// Parsers for pasted Fathom transcripts. Text is kept exactly as written apart
// from surrounding whitespace; each segment ends where the next one starts,
// and the last one ends at the end of the video.

export type ParsedSegment = {
  speaker: string;
  startMs: number;
  endMs: number;
  text: string;
};

type Utterance = Omit<ParsedSegment, "endMs">;

function withEnds(utterances: Utterance[], durationMs: number): ParsedSegment[] {
  if (utterances.length === 0) throw new Error("Transcript has no segments");
  return utterances.map((u, i) => {
    const endMs = i + 1 < utterances.length ? utterances[i + 1].startMs : durationMs;
    if (endMs < u.startMs) throw new Error(`Segment at ${u.startMs}ms is out of order`);
    return { ...u, endMs };
  });
}

const lines = (source: string) =>
  source
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

// One utterance per line: `Nirali : 1.13 - Right? So ...` where `1.13` is 1:13.
const INLINE = /^(.+?)\s*:\s*(\d+)\.(\d{1,2})\s*-\s*(.+)$/;

export function parseInlineTranscript(source: string, durationMs: number): ParsedSegment[] {
  const utterances: Utterance[] = [];
  for (const line of lines(source)) {
    const match = INLINE.exec(line);
    if (!match) continue; // title, recording link and `---` lines
    const [, speaker, minutes, seconds, text] = match;
    utterances.push({ speaker, startMs: (Number(minutes) * 60 + Number(seconds)) * 1000, text });
  }
  return withEnds(utterances, durationMs);
}

// A speaker line, then `m:ss` / text pairs until the next speaker:
//   Andrew
//   0:02
//   Hi, Kim. ...
const TIMESTAMP = /^(?:(\d+):)?(\d+):(\d{2})$/;

export function parseBlockTranscript(source: string, durationMs: number): ParsedSegment[] {
  const [title, ...rest] = lines(source);
  if (!title?.startsWith("Transcript")) throw new Error("Expected a `Transcript - ...` title line");

  const utterances: Utterance[] = [];
  let speaker: string | null = null;
  let startMs: number | null = null;
  for (const line of rest) {
    const ts = TIMESTAMP.exec(line);
    if (startMs !== null) {
      if (ts || !speaker) throw new Error(`Expected text after timestamp, got "${line}"`);
      utterances.push({ speaker, startMs, text: line });
      startMs = null;
    } else if (ts) {
      if (!speaker) throw new Error(`Timestamp "${line}" before any speaker`);
      const [, h = "0", m, s] = ts;
      startMs = (Number(h) * 3600 + Number(m) * 60 + Number(s)) * 1000;
    } else {
      speaker = line;
    }
  }
  if (startMs !== null) throw new Error("Transcript ends with a timestamp and no text");
  return withEnds(utterances, durationMs);
}
