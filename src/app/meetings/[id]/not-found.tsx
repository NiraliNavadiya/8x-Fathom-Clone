import { VideoOff } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function MeetingNotFound() {
  return (
    <div className="page-container flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <VideoOff className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-semibold">Meeting not found</h1>
      <p className="max-w-sm text-muted-foreground">It may have been deleted, or the link is wrong.</p>
      <Link href="/calls" className={buttonVariants()}>
        Back to All Calls
      </Link>
    </div>
  );
}
