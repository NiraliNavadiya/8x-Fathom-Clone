import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MeetingWorkspace } from "@/components/meeting/meeting-workspace";
import { WaveLoader } from "@/components/wave-loader";
import { restoreDeletedOnReload } from "@/lib/demo-restore";
import { listFolders } from "@/lib/folders";
import { getMeetingWorkspace } from "@/lib/meetings";
import { getShareInfo } from "@/lib/shares";

async function MeetingView({
  params,
  searchParams,
}: Pick<PageProps<"/meetings/[id]">, "params" | "searchParams">) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  await restoreDeletedOnReload();
  const [meeting, folders, share] = await Promise.all([
    getMeetingWorkspace(id),
    listFolders(),
    // Sharing failing (e.g. SHARE_LINK_SECRET missing) shouldn't take the page down.
    getShareInfo(id).catch((error) => {
      console.error("Couldn't load share link", error);
      return null;
    }),
  ]);
  if (!meeting) notFound();

  // `?t=85` starts the video at 1:25 (links from Ask Meetly use this).
  const seconds = Number(typeof t === "string" ? t : NaN);
  const startMs = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) * 1000 : 0;

  return (
    <>
      <title>{`${meeting.title} · Meetly`}</title>
      <MeetingWorkspace meeting={meeting} folders={folders} share={share} startMs={startMs} />
    </>
  );
}

export default function MeetingPage({ params, searchParams }: PageProps<"/meetings/[id]">) {
  return (
    <main className="page-container flex flex-1 flex-col py-8">
      <Suspense fallback={<WaveLoader label="Loading meeting" />}>
        <MeetingView params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
