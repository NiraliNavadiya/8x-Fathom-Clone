import type { Metadata } from "next";
import { Suspense } from "react";
import { CallsGrid, NoCalls } from "@/components/calls-grid";
import { WaveLoader } from "@/components/wave-loader";
import { restoreDeletedOnReload } from "@/lib/demo-restore";
import { listFolders } from "@/lib/folders";
import { listMeetings } from "@/lib/meetings";
import { getShareInfo } from "@/lib/shares";

export const metadata: Metadata = { title: "All Calls · Meetly" };

async function Calls() {
  await restoreDeletedOnReload();
  const [meetings, folders] = await Promise.all([listMeetings(), listFolders()]);
  const shareInfos = Object.fromEntries(
    await Promise.all(
      meetings.map(async (meeting) => [
        meeting.id,
        await getShareInfo(meeting.id).catch((error) => {
          console.error(`Couldn't load share link for meeting ${meeting.id}`, error);
          return null;
        }),
      ]),
    ),
  );
  return (
    <CallsGrid
      meetings={meetings}
      folders={folders}
      shareInfos={shareInfos}
      empty={
        <NoCalls>
          No calls yet. Run <code className="text-foreground">npm run videos:import</code> to add the videos in storage.
        </NoCalls>
      }
    />
  );
}

export default function CallsPage() {
  return (
    <main className="page-container flex flex-1 flex-col py-8">
      {/*<h1 className="mb-6 text-2xl font-semibold">All Calls</h1>*/}
      <Suspense fallback={<WaveLoader label="Loading calls" />}>
        <Calls />
      </Suspense>
    </main>
  );
}
