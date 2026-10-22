import type { Metadata } from "next";
import { Suspense } from "react";
import { CallsGrid, NoCalls } from "@/components/calls-grid";
import { WaveLoader } from "@/components/wave-loader";
import { restoreDeletedOnReload } from "@/lib/demo-restore";
import { listFolders } from "@/lib/folders";
import { listMeetings } from "@/lib/meetings";

export const metadata: Metadata = { title: "All Calls · Meetly" };

async function Calls() {
  await restoreDeletedOnReload();
  const [meetings, folders] = await Promise.all([listMeetings(), listFolders()]);
  return (
    <CallsGrid
      meetings={meetings}
      folders={folders}
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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">All Calls</h1>
      <Suspense fallback={<WaveLoader label="Loading calls" />}>
        <Calls />
      </Suspense>
    </main>
  );
}
