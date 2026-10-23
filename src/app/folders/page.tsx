import { Folder } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NewFolderButton } from "@/app/folders/new-folder-button";
import { WaveLoader } from "@/components/wave-loader";
import { listFolders } from "@/lib/folders";
import { restoreDeletedOnReload } from "@/lib/demo-restore";

export const metadata: Metadata = { title: "Folders · Meetly" };

async function FolderGrid() {
  await restoreDeletedOnReload();
  const folders = await listFolders();

  if (folders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <Folder className="size-12 fill-yellow-400/20 text-yellow-400" aria-hidden />
        <p className="max-w-sm text-muted-foreground">
          No folders yet. Create one here, or use “Move to folder” on any call.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {folders.map((folder) => (
        <li key={folder.id}>
          <Link
            href={`/folders/${folder.id}`}
            className="group flex flex-col items-center gap-2 rounded-xl border border-transparent p-4 text-center transition-colors hover:border-border hover:bg-card focus-visible:border-primary focus-visible:bg-card"
          >
            <Folder
              className="size-16 fill-yellow-400 text-yellow-500 transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 sm:size-20"
              strokeWidth={1.25}
              aria-hidden
            />
            <span className="w-full truncate font-medium">{folder.name}</span>
            <span className="text-xs text-muted-foreground">
              {folder.meetingCount} {folder.meetingCount === 1 ? "call" : "calls"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function FoldersPage() {
  return (
    <main className="page-container flex flex-1 flex-col py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Folders</h1>
        <NewFolderButton />
      </div>
      <Suspense fallback={<WaveLoader label="Loading folders" />}>
        <FolderGrid />
      </Suspense>
    </main>
  );
}
