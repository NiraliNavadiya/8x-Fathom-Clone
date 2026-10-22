import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { WaveLoader } from "@/components/wave-loader";
import { restoreDeletedOnReload } from "@/lib/demo-restore";
import { formatMeetingDate, formatTimestamp } from "@/lib/format";
import { getMeeting } from "@/lib/meetings";

async function MeetingView({
  params,
  searchParams,
}: Pick<PageProps<"/meetings/[id]">, "params" | "searchParams">) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  await restoreDeletedOnReload();
  const meeting = await getMeeting(id);
  if (!meeting) notFound();

  // `?t=85` starts the video at 1:25 (links from Ask Meetly use this).
  const start = Number(typeof t === "string" ? t : NaN);
  const fragment = Number.isFinite(start) && start > 0 ? `#t=${Math.floor(start)}` : "";

  return (
    <>
      <title>{`${meeting.title} · Meetly`}</title>
      <Breadcrumbs
        items={[
          { label: "All Calls", href: "/calls" },
          ...(meeting.folder ? [{ label: meeting.folder.name, href: `/folders/${meeting.folder.id}` }] : []),
          { label: meeting.title },
        ]}
      />
      <h1 className="text-2xl font-semibold">{meeting.title}</h1>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        {formatMeetingDate(meeting.recordedAt, meeting.createdAt)}
        {meeting.durationMs !== null && ` · ${formatTimestamp(meeting.durationMs)}`}
      </p>
      <video
        key={fragment}
        controls
        preload="metadata"
        className="mb-8 aspect-video w-full rounded-lg border bg-black"
        src={`/api/meetings/${meeting.id}/video${fragment}`}
      />

      <h2 className="mb-3 text-lg font-semibold">Transcript</h2>
      {meeting.transcript ? (
        <ol className="space-y-3">
          {meeting.transcript.segments.map((segment) => (
            <li key={segment.id} className="grid grid-cols-[3.5rem_1fr] gap-2">
              <span className="text-sm text-primary tabular-nums">{formatTimestamp(segment.startMs)}</span>
              <p>
                {segment.speaker && <span className="font-medium">{segment.speaker}: </span>}
                {segment.text}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground">No transcript yet.</p>
      )}
    </>
  );
}

export default function MeetingPage({ params, searchParams }: PageProps<"/meetings/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
      <Suspense fallback={<WaveLoader label="Loading meeting" />}>
        <MeetingView params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
