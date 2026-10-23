import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CallsGrid, NoCalls } from "@/components/calls-grid";
import { WaveLoader } from "@/components/wave-loader";
import { restoreDeletedOnReload } from "@/lib/demo-restore";
import { getFolder, listFolders } from "@/lib/folders";
import { listMeetings } from "@/lib/meetings";
import { getShareInfo } from "@/lib/shares";

async function FolderView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await restoreDeletedOnReload();
  const folder = await getFolder(id);
  if (!folder) notFound();
  const [meetings, folders] = await Promise.all([listMeetings({ folderId: folder.id }), listFolders()]);
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
    <>
      <title>{`${folder.name} · Meetly`}</title>
      <Breadcrumbs items={[{ label: "Folders", href: "/folders" }, { label: folder.name }]} />
      <h1 className="mb-6 text-2xl font-semibold">{folder.name}</h1>
      <CallsGrid
        meetings={meetings}
        folders={folders}
        shareInfos={shareInfos}
        empty={<NoCalls>No calls in this folder yet. Use “Move to folder” on any call to add it here.</NoCalls>}
      />
    </>
  );
}

export default function FolderPage({ params }: PageProps<"/folders/[id]">) {
  return (
    <main className="page-container flex flex-1 flex-col py-8">
      <Suspense fallback={<WaveLoader label="Loading folder" />}>
        <FolderView params={params} />
      </Suspense>
    </main>
  );
}
