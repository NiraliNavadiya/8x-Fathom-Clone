import { FileText, Video } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { listMeetings } from "@/lib/meetings";

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function MeetingList() {
  await connection();
  const meetings = await listMeetings();

  if (meetings.length === 0) {
    return (
      <p className="text-muted-foreground">
        No meetings yet. Run <code>npm run videos:import</code> to add the videos in storage.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {meetings.map((meeting) => (
        <li key={meeting.id}>
          <Link
            href={`/meetings/${meeting.id}`}
            className="flex items-center gap-4 p-4 transition-colors hover:bg-muted"
          >
            <Video className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{meeting.title}</p>
              <p className="text-sm text-muted-foreground">
                {formatSize(meeting.videoSizeBytes)} · {meeting.status.toLowerCase()}
              </p>
            </div>
            {meeting.hasTranscript && (
              <FileText className="size-4 text-muted-foreground" aria-label="Has transcript" />
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Meetings</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading meetings…</p>}>
        <MeetingList />
      </Suspense>
    </main>
  );
}
