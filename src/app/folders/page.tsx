import { Folder, FolderOpen } from "lucide-react";
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
      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
          <FolderOpen
            className="size-6 text-muted-foreground"
            aria-hidden
          />
        </div>
        <h2 className="text-base font-semibold">No folders yet</h2>
        <p className="mt-1 max-w-xs text-sm leading-5 text-muted-foreground">
          Create a folder to organize your meetings and find them easily later.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {folders.map((folder) => (
        <li key={folder.id}>
          <Link
            href={`/folders/${folder.id}`}
            className="group flex min-w-0 flex-col rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Folder
              className="mb-4 size-9 fill-amber-400/20 text-amber-500 transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
              strokeWidth={1.5}
              aria-hidden
            />
            <span className="truncate text-sm font-medium">
              {folder.name}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              {folder.meetingCount}{" "}
              {folder.meetingCount === 1 ? "call" : "calls"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function FoldersPage() {
  return (
    <main className="page-container flex flex-1 flex-col py-6 sm:py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Organize your calls into folders to find them easily later.
        </p>
        <NewFolderButton />
      </div>

      <Suspense fallback={<WaveLoader label="Loading folders" />}>
        <FolderGrid />
      </Suspense>
    </main>
  );
}
