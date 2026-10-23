"use client";

import { MessageSquareText } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { createAnnotationAction } from "@/app/actions";
import type { AnnotationType } from "@/generated/prisma/enums";
import type { AnnotationView, TranscriptDetail, TranscriptSegment } from "@/lib/meetings";
import { CopyButton } from "./copy-button";
import { transcriptToText } from "./copy-text";
import { MARKERS } from "./markers";
import { marksBySegment, splitByMarks, type Mark } from "./marks";
import { usePlayer } from "./player-context";
import { SelectionPopover } from "./selection-popover";
import { SpeakerAvatar, UNKNOWN_SPEAKER, type SpeakerColor } from "./speakers";
import { PlayMomentButton } from "./time-chip";

type Selection = {
  startSegmentId: string;
  startOffset: number;
  endSegmentId: string;
  endOffset: number;
  text: string;
  rect: DOMRect;
};

// How long a manual scroll pauses following the playing segment.
const FOLLOW_PAUSE_MS = 4_000;

/**
 * Speaker turns with the playing segment highlighted and followed. Clicking a
 * segment plays from it; selecting text offers Highlight / Note / Needs review.
 * Text is shown exactly as stored, with saved annotations marked inline.
 */
export function TranscriptTab({
  meetingId,
  transcript,
  colors,
  annotations,
  onAnnotationCreated,
  readOnly = false,
}: {
  meetingId: string;
  transcript: TranscriptDetail | null;
  colors: Map<string, SpeakerColor>;
  annotations: AnnotationView[];
  onAnnotationCreated?: (annotation: AnnotationView) => void;
  /** Shared pages: no selecting text to annotate. */
  readOnly?: boolean;
}) {
  const { currentMs, seek } = usePlayer();
  const list = useRef<HTMLOListElement>(null);
  const lastManualScroll = useRef(0);
  const [selection, setSelection] = useState<Selection | null>(null);
  const writingNote = useRef(false);

  const segments = useMemo(() => transcript?.segments ?? [], [transcript]);
  const activeId = segments.find((s) => currentMs >= s.startMs && currentMs < s.endMs)?.id ?? null;
  const marks = useMemo(() => marksBySegment(segments, annotations), [segments, annotations]);

  // Follow the playing segment inside the tab's scroll area, unless the
  // reader scrolled recently. Never scrolls the page itself.
  useEffect(() => {
    const scroller = list.current?.closest<HTMLElement>("[data-slot=tabs-content]");
    if (!scroller || !activeId || Date.now() - lastManualScroll.current < FOLLOW_PAUSE_MS) return;
    if (window.getSelection()?.isCollapsed === false) return; // don't pull text out from under a selection
    const row = scroller.querySelector<HTMLElement>(`[data-segment-id="${activeId}"]`);
    if (!row || row.offsetParent === null) return; // tab hidden
    const top = row.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo({ top: top - scroller.clientHeight / 3, behavior: reduce ? "auto" : "smooth" });
  }, [activeId]);

  useEffect(() => {
    const scroller = list.current?.closest<HTMLElement>("[data-slot=tabs-content]");
    if (!scroller) return;
    const manual = () => (lastManualScroll.current = Date.now());
    const hide = () => !writingNote.current && setSelection(null);
    scroller.addEventListener("wheel", manual, { passive: true });
    scroller.addEventListener("touchmove", manual, { passive: true });
    scroller.addEventListener("scroll", hide, { passive: true });
    return () => {
      scroller.removeEventListener("wheel", manual);
      scroller.removeEventListener("touchmove", manual);
      scroller.removeEventListener("scroll", hide);
    };
  }, [segments.length]);

  const readSelection = useCallback(() => {
    if (writingNote.current) return;
    const next = readTranscriptSelection(list.current);
    if (next) setSelection(next);
  }, []);
  const closePopover = useCallback(() => {
    writingNote.current = false;
    setSelection(null);
  }, []);

  async function create(type: AnnotationType, note?: string): Promise<string | null> {
    if (!selection) return "Select some transcript text first.";
    const result = await createAnnotationAction({
      meetingId,
      type,
      startSegmentId: selection.startSegmentId,
      startOffset: selection.startOffset,
      endSegmentId: selection.endSegmentId,
      endOffset: selection.endOffset,
      note,
    });
    if (!result.ok) return result.error; // shown in the popover, which keeps the draft
    onAnnotationCreated?.(result.data);
    toast.success(type === "HIGHLIGHT" ? "Highlight saved" : "Annotation saved");
    window.getSelection()?.removeAllRanges();
    closePopover();
    return null;
  }

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
        <MessageSquareText className="size-6" aria-hidden />
        No transcript for this meeting yet.
      </div>
    );
  }

  const turns: { speaker: string | null; segments: TranscriptSegment[] }[] = [];
  for (const segment of segments) {
    const last = turns.at(-1);
    if (last && last.speaker === segment.speaker) last.segments.push(segment);
    else turns.push({ speaker: segment.speaker, segments: [segment] });
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {readOnly ? "Click a line to play from it." : "Click a line to play from it. Select text to highlight it or add a note."}
        </p>
        <CopyButton label="Copy transcript" text={() => transcriptToText(transcript!)} />
      </div>
      <ol
        ref={list}
        className="grid gap-5"
        aria-label="Transcript"
        onMouseUp={readOnly ? undefined : readSelection}
        onKeyUp={readOnly ? undefined : (e) => e.shiftKey && readSelection()}
      >
        {turns.map((turn) => {
          const color = turn.speaker ? (colors.get(turn.speaker) ?? UNKNOWN_SPEAKER) : UNKNOWN_SPEAKER;
          return (
            <li key={turn.segments[0].id} className="grid grid-cols-[1.75rem_1fr] gap-x-3">
              <SpeakerAvatar name={turn.speaker ?? "?"} color={color} className="mt-0.5" />
              <div className="min-w-0">
                <p className={cn("mb-1 text-sm font-semibold", color.text)}>{turn.speaker ?? "Unknown speaker"}</p>
                <ol className="grid gap-0.5">
                  {turn.segments.map((segment) => (
                    <SegmentRow
                      key={segment.id}
                      segment={segment}
                      active={segment.id === activeId}
                      marks={marks.get(segment.id)}
                      onSeek={seek}
                    />
                  ))}
                </ol>
              </div>
            </li>
          );
        })}
      </ol>

      {selection && (
        <SelectionPopover
          key={`${selection.startSegmentId}:${selection.startOffset}:${selection.endSegmentId}:${selection.endOffset}`}
          rect={selection.rect}
          onSave={create}
          onClose={closePopover}
          onNoteModeChange={(writing) => (writingNote.current = writing)}
        />
      )}
    </>
  );
}

const SegmentRow = memo(function SegmentRow({
  segment,
  active,
  marks,
  onSeek,
}: {
  segment: TranscriptSegment;
  active: boolean;
  marks: Mark[] | undefined;
  onSeek: (ms: number) => void;
}) {
  return (
    <li
      id={`segment-${segment.id}`}
      data-segment-id={segment.id}
      data-start-ms={segment.startMs}
      data-end-ms={segment.endMs}
      aria-current={active ? "true" : undefined}
      onClick={() => {
        // A click that ends a text selection shouldn't jump the video.
        if (window.getSelection()?.isCollapsed !== false) onSeek(segment.startMs);
      }}
      className={cn(
        "group/segment relative -mx-2 grid cursor-pointer grid-cols-[1fr_auto] items-start gap-x-2 rounded-lg px-2 py-1 transition-colors duration-150",
        active ? "bg-accent/70" : "hover:bg-muted/60",
      )}
    >
      {active && <span aria-hidden className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary" />}
      <p data-segment-text className="text-sm leading-relaxed">
        <MarkedText text={segment.text} marks={marks} />
      </p>
      {/* Keyboard and screen-reader access to the same seek. */}
      <PlayMomentButton
        ms={segment.startMs}
        className="size-6 opacity-0 transition-opacity group-hover/segment:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
      />
    </li>
  );
});

function MarkedText({ text, marks }: { text: string; marks: Mark[] | undefined }) {
  return (
    <>
      {splitByMarks(text, marks ?? []).map(({ from, text: piece, type }) =>
        type ? (
          <mark key={from} className={cn("rounded-sm text-inherit", MARKERS[type].mark)}>
            {piece}
          </mark>
        ) : (
          piece
        ),
      )}
    </>
  );
}

/** The current text selection as segment ids and character offsets, if it's inside the transcript. */
function readTranscriptSelection(root: HTMLElement | null): Selection | null {
  const sel = window.getSelection();
  if (!root || !sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const textOf = (node: Node) =>
    (node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element))?.closest<HTMLElement>(
      "[data-segment-text]",
    );
  const startText = textOf(range.startContainer);
  const endText = textOf(range.endContainer);
  if (!startText || !endText || !root.contains(startText) || !root.contains(endText)) return null;

  const offset = (container: HTMLElement, node: Node, at: number) => {
    const r = document.createRange();
    r.selectNodeContents(container);
    r.setEnd(node, at);
    return r.toString().length;
  };
  const text = sel.toString().trim();
  if (!text) return null;
  return {
    startSegmentId: startText.closest<HTMLElement>("[data-segment-id]")!.dataset.segmentId!,
    startOffset: offset(startText, range.startContainer, range.startOffset),
    endSegmentId: endText.closest<HTMLElement>("[data-segment-id]")!.dataset.segmentId!,
    endOffset: offset(endText, range.endContainer, range.endOffset),
    text,
    rect: range.getBoundingClientRect(),
  };
}
