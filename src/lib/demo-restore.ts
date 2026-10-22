import "server-only";

import { headers } from "next/headers";
import { connection } from "next/server";
import { restoreDeletedMeetings } from "@/lib/meetings";

// DEMO BEHAVIOUR: deleting a meeting only lasts until the browser reloads the
// page. A full document load has no `rsc` header; client navigations,
// prefetches and router refreshes do, so they keep deleted meetings hidden.
// Remove this (and its callers) to make deletes permanent.
export async function restoreDeletedOnReload() {
  // The Prisma update uses @updatedAt, which evaluates new Date(). Keep it
  // out of prerendering and run the demo restore only for a real request.
  await connection();
  if ((await headers()).get("rsc") === null) await restoreDeletedMeetings();
}
