// Registers the videos already in the Neon storage bucket as meetings.
// Reads object metadata only; nothing is downloaded or re-uploaded.
// Run with `npm run videos:import`.
import "../src/test/load-env";
import { db } from "@/lib/db";
import { importVideosFromBucket } from "@/lib/videos";

const meetings = await importVideosFromBucket();
for (const m of meetings) {
  console.log(`${m.id}  ${m.title}  (${m.videoSizeBytes} bytes, ${m.videoContentType})`);
}
console.log(`Imported ${meetings.length} video(s).`);
await db().$disconnect();
