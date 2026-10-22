import "server-only";

import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { upsertMeetingByVideoKey, type MeetingSummary } from "@/lib/meetings";
import { MEETINGS_BUCKET, storage } from "@/lib/storage";

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|m4v)$/i;

function titleFromKey(key: string): string {
  const name = key.split("/").pop() ?? key;
  return name.replace(VIDEO_EXTENSIONS, "").replace(/_+/g, " ").replace(/\s+/g, " ").trim() || name;
}

// Registers every video already in the bucket as a meeting. Reads object
// metadata only; the video bytes are never downloaded.
export async function importVideosFromBucket(): Promise<MeetingSummary[]> {
  const s3 = storage();
  const imported: MeetingSummary[] = [];
  let ContinuationToken: string | undefined;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: MEETINGS_BUCKET, ContinuationToken }),
    );
    for (const object of page.Contents ?? []) {
      if (!object.Key || !VIDEO_EXTENSIONS.test(object.Key)) continue;

      const head = await s3.send(new HeadObjectCommand({ Bucket: MEETINGS_BUCKET, Key: object.Key }));
      const contentType = head.ContentType?.startsWith("video/") ? head.ContentType : "video/mp4";

      imported.push(
        await upsertMeetingByVideoKey({
          title: titleFromKey(object.Key),
          videoKey: object.Key,
          videoContentType: contentType,
          videoSizeBytes: head.ContentLength ?? object.Size ?? 0,
        }),
      );
    }
    ContinuationToken = page.NextContinuationToken;
  } while (ContinuationToken);

  return imported;
}

// Short-lived URL the browser streams from directly (supports range requests).
export function videoUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  return getSignedUrl(storage(), new GetObjectCommand({ Bucket: MEETINGS_BUCKET, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}
