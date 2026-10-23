"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Copies `text()` and briefly shows "Copied". */
export function CopyButton({ label, text }: { label: string; text: () => string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text());
      setCopied(true);
    } catch {
      toast.error("Couldn't copy. Your browser blocked clipboard access.");
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={copy}
            aria-label={label}
            className={copied ? "text-emerald-300" : "text-muted-foreground"}
          />
        }
      >
        {copied ? <Check /> : <Copy />}
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied" : label}</TooltipContent>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </Tooltip>
  );
}
