"use client";

import { FolderPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { NewFolderDialog } from "@/components/new-folder-dialog";
import { Button } from "@/components/ui/button";

export function NewFolderButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <FolderPlus aria-hidden /> New folder
      </Button>
      <NewFolderDialog open={open} onOpenChange={setOpen} onCreated={(f) => toast.success(`Created ${f.name}`)} />
    </>
  );
}
