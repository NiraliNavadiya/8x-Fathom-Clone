import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMeeting } from "@/lib/meetings";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function MeetingView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeeting(id);
  if (!meeting) notFound();

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">{meeting.title}</h1>
      <video
        controls
        preload="metadata"
        className="mb-8 aspect-video w-full rounded-lg bg-black"
        src={`/api/meetings/${meeting.id}/video`}
      />

      <h2 className="mb-3 text-lg font-semibold">Transcript</h2>
      {meeting.transcript ? (
        <ol className="space-y-3">
          {meeting.transcript.segments.map((segment, i) => (
            <li key={i} className="grid grid-cols-[3.5rem_1fr] gap-2">
              <span className="text-sm tabular-nums text-muted-foreground">
                {formatTime(segment.startSeconds)}
              </span>
              <p>
                <span className="font-medium">{segment.speaker}: </span>
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

export default function MeetingPage({ params }: PageProps<"/meetings/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> All meetings
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Loading meeting…</p>}>
        <MeetingView params={params} />
      </Suspense>
    </main>
  );
}
