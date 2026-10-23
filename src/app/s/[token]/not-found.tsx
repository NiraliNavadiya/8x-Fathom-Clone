import { LinkIcon } from "lucide-react";

export default function SharedNotFound() {
  return (
    <div className="page-container flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <LinkIcon className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-semibold">This link is no longer available</h1>
      <p className="max-w-sm text-muted-foreground">It may have been revoked, or the meeting was removed. Ask the owner for a new link.</p>
    </div>
  );
}
