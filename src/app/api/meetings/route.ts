import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { connection } from "next/server";
import { z } from "zod";
import { handleError, jsonError, readJson } from "@/lib/http";
import { createMeeting, listMeetings } from "@/lib/meetings";
import { MEETINGS_BUCKET, storage } from "@/lib/storage";

export async function GET() {
  await connection();
  return Response.json({ meetings: await listMeetings() });
}

const registerSchema = z.object({
  title: z.string().trim().min(1).max(300),
  videoKey: z.string().min(1).max(1024),
  recordedAt: z.coerce.date().optional(),
});

// Registers a video that is already in the bucket. Size and type come from
// storage, not the client.
export async function POST(request: Request) {
  const body = await readJson(request);
  if (body instanceof Response) return body;

  try {
    const { title, videoKey, recordedAt } = registerSchema.parse(body);

    let head;
    try {
      head = await storage().send(new HeadObjectCommand({ Bucket: MEETINGS_BUCKET, Key: videoKey }));
    } catch (error) {
      if (error instanceof Error && error.name === "NotFound") {
        return jsonError(404, "No video with that key in storage");
      }
      throw error;
    }

    const meeting = await createMeeting({
      title,
      recordedAt,
      videoKey,
      videoContentType: head.ContentType ?? "video/mp4",
      videoSizeBytes: head.ContentLength ?? 0,
    });
    return Response.json({ meeting }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return jsonError(409, "A meeting already exists for that video");
    }
    return handleError(error);
  }
}
