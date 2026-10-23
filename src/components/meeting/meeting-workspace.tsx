"use client";

import { AudioLines, FileText, MessageSquareText, Sparkles } from "lucide-react";
import { useState } from "react";
import { AskChat, useAskChat } from "@/components/ask-chat";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FolderSummary } from "@/lib/folders";
import type { ShareInfo } from "@/lib/shares";
import type { ActionItemView, AnnotationView, MeetingWorkspace as Meeting } from "@/lib/meetings";
import { ActionItems } from "./action-items";
import { chaptersFor } from "./chapters";
import { Annotations } from "./annotations";
import type { MarkerKind } from "./markers";
import { MeetingHeader } from "./meeting-header";
import { PlayerProvider, usePlayer } from "./player-context";
import { speakerColors } from "./speakers";
import { SummaryTab } from "./summary-tab";
import { TranscriptTab } from "./transcript-tab";
import { VideoPlayer } from "./video-player";

/**
 * A list the page edits locally after each successful save, reset to the
 * server's copy whenever fresh data arrives (the actions also refresh).
 */
function useServerList<T extends { id: string }>(fromServer: T[]) {
  const [list, setList] = useState(fromServer);
  const [source, setSource] = useState(fromServer);
  if (source !== fromServer) {
    setSource(fromServer);
    setList(fromServer);
  }
  return {
    list,
    upsert: (item: T) =>
      setList((prev) => (prev.some((x) => x.id === item.id) ? prev.map((x) => (x.id === item.id ? item : x)) : [...prev, item])),
    remove: (id: string) => setList((prev) => prev.filter((x) => x.id !== id)),
  };
}

const ASK_SUGGESTIONS = ["Summarize this call", "What are the action items?", "What decisions were made?"];

/**
 * Desktop: tabs on the left; video (with its chapters), action items and annotations
 * stacked on the right in that order. Mobile: video first, then
 * the tabs, then action items and annotations.
 *
 * `shared` renders the same page read-only for a share link: video, summary,
 * transcript and speakers, without editing, Ask Meetly or private details.
 */
export function MeetingWorkspace({
  meeting,
  folders,
  share,
  startMs,
  shared,
}: {
  meeting: Meeting;
  folders: FolderSummary[];
  share: ShareInfo | null;
  startMs: number;
  shared?: { videoPath: string };
}) {
  const colors = speakerColors(meeting.speakerDetails.map((s) => s.name));
  const annotations = useServerList<AnnotationView>(meeting.annotations);
  const actionItems = useServerList<ActionItemView>(meeting.actionItems);

  // One source for every moment, so markers follow edits and deletes.
  const markers = [
    ...annotations.list.map((a) => ({ id: a.id, kind: a.type as MarkerKind, ms: a.startMs, label: a.note ?? a.quote })),
    ...actionItems.list
      .filter((a) => a.timestampMs !== null)
      .map((a) => ({ id: a.id, kind: "ACTION_ITEM" as const, ms: a.timestampMs!, label: a.description })),
  ];

  return (
    <PlayerProvider initialDurationMs={meeting.durationMs ?? 0}>
      {shared ? (
        <p className="mb-6 flex items-center gap-2 border-b pb-3 text-sm text-muted-foreground">
          <span className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground">
            <AudioLines className="size-3.5" aria-hidden />
          </span>
          Shared with you via <span className="font-semibold text-foreground">Meetly</span> · view only
        </p>
      ) : (
        <Breadcrumbs
          items={[
            { label: "All Calls", href: "/calls" },
            ...(meeting.folder ? [{ label: meeting.folder.name, href: `/folders/${meeting.folder.id}` }] : []),
            { label: meeting.title },
          ]}
        />
      )}
      <MeetingHeader meeting={meeting} folders={folders} share={share} colors={colors} readOnly={!!shared} />

      <div className="mt-5 grid gap-5 [grid-template-areas:'player'_'tabs'_'details'] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:[grid-template-areas:'tabs_player'_'tabs_details']">
        <div className="grid gap-4 [grid-area:player]">
          <VideoPlayer
            meetingId={meeting.id}
            videoPath={shared?.videoPath}
            title={meeting.title}
            startMs={startMs}
            chapters={chaptersFor(meeting.timeline, meeting.transcript?.segments ?? [], meeting.durationMs ?? 0)}
            markers={markers}
          />
        </div>

        <div className="[grid-area:tabs] lg:sticky lg:top-24 lg:h-[calc(100dvh-7rem)] lg:self-start">
          <LeftTabs
            meeting={meeting}
            colors={colors}
            annotations={annotations.list}
            onAnnotationCreated={annotations.upsert}
            readOnly={!!shared}
          />
        </div>

        {!shared && (
          <div className="grid content-start gap-4 [grid-area:details]">
            <ActionItems
              items={actionItems.list}
              speakers={meeting.speakerDetails}
              colors={colors}
              onChanged={actionItems.upsert}
              onDeleted={actionItems.remove}
            />
            <Annotations annotations={annotations.list} onUpdated={annotations.upsert} onDeleted={annotations.remove} />
          </div>
        )}
      </div>
    </PlayerProvider>
  );
}

function LeftTabs({
  meeting,
  colors,
  annotations,
  onAnnotationCreated,
  readOnly,
}: {
  meeting: Meeting;
  colors: ReturnType<typeof speakerColors>;
  annotations: AnnotationView[];
  onAnnotationCreated: (annotation: AnnotationView) => void;
  readOnly: boolean;
}) {
  const chat = useAskChat(meeting.id);
  const { seek } = usePlayer();

  return (
    <Tabs defaultValue="summary" className="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-xl border bg-card">
      <TabsList variant="line" className="w-full shrink-0 justify-start gap-0 border-b px-2 group-data-horizontal/tabs:h-9 bg-border">
        <TabsTrigger value="summary" className="flex-none px-3 data-active:text-primary after:bg-primary">
          <FileText aria-hidden /> Summary
        </TabsTrigger>
        <TabsTrigger value="transcript" className="flex-none px-3 data-active:text-primary after:bg-primary">
          <MessageSquareText aria-hidden /> Transcript
        </TabsTrigger>
        {!readOnly && (
          <TabsTrigger value="ask" className="flex-none px-3 data-active:text-primary after:bg-primary">
            <Sparkles aria-hidden /> Ask Meetly
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="summary" className="min-h-0 overflow-y-auto p-3 max-lg:max-h-[70vh]">
        <SummaryTab summaries={meeting.summaries} />
      </TabsContent>
      <TabsContent value="transcript" keepMounted className="min-h-0 overflow-y-auto p-3 max-lg:max-h-[70vh]">
        <TranscriptTab
          meetingId={meeting.id}
          transcript={meeting.transcript}
          colors={colors}
          annotations={annotations}
          onAnnotationCreated={onAnnotationCreated}
          readOnly={readOnly}
        />
      </TabsContent>
      {!readOnly && (
        <TabsContent value="ask" className="flex min-h-0 flex-col max-lg:h-[70vh]">
          <AskChat
            chat={chat}
            suggestions={ASK_SUGGESTIONS}
            intro="Ask about this call. Answers link to the moment in the video."
            citationTarget={{ kind: "seek", onSeek: (c) => seek(c.startMs) }}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}
