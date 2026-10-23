"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

export default function MeetingError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div role="alert" className="page-container flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertTriangle className="size-10 text-primary" aria-hidden />
      <h1 className="text-xl font-semibold">Couldn’t load this meeting</h1>
      <p className="max-w-sm text-muted-foreground">Something went wrong on our side. Try again in a moment.</p>
      <div className="flex gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href="/calls" className={buttonVariants({ variant: "outline" })}>
          All Calls
        </Link>
      </div>
    </div>
  );
}
