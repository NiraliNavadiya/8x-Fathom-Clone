import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MeetingWorkspace } from "@/components/meeting/meeting-workspace";
import { WaveLoader } from "@/components/wave-loader";
import { getMeetingWorkspace } from "@/lib/meetings";
import { meetingIdForToken } from "@/lib/shares";

// Keep shared links out of search results and other sites' referrer logs.
export const metadata: Metadata = {
  title: "Shared meeting · Meetly",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

async function Shared({ params }: Pick<PageProps<"/s/[token]">, "params">) {
  const { token } = await params;
  const meetingId = await meetingIdForToken(token);
  const meeting = meetingId && (await getMeetingWorkspace(meetingId));
  if (!meeting) notFound();
  // Same page the owner sees, minus private data: action items, annotations,
  // folder and description never reach the viewer's browser.
  const shared = { ...meeting, description: null, folder: null, actionItems: [], annotations: [] };
  return (
    <>
      <title>{`${meeting.title} · Shared via Meetly`}</title>
      <MeetingWorkspace
        meeting={shared}
        folders={[]}
        share={null}
        startMs={0}
        shared={{ videoPath: `/api/share/${token}/video` }}
      />
    </>
  );
}

export default function SharedPage({ params }: PageProps<"/s/[token]">) {
  return (
    <main className="page-container flex flex-1 flex-col py-8">
      <Suspense fallback={<WaveLoader label="Loading shared meeting" />}>
        <Shared params={params} />
      </Suspense>
    </main>
  );
}
