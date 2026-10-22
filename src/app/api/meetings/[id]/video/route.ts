import { jsonError } from "@/lib/http";
import { getMeetingVideoKey } from "@/lib/meetings";
import { videoUrl } from "@/lib/videos";

// Redirects to a short-lived presigned URL so the browser streams the video
// straight from storage instead of through the app.
export async function GET(_request: Request, { params }: RouteContext<"/api/meetings/[id]/video">) {
  const { id } = await params;
  const key = await getMeetingVideoKey(id);
  if (!key) return jsonError(404, "Meeting not found");

  return new Response(null, {
    status: 302,
    headers: { Location: await videoUrl(key), "Cache-Control": "no-store" },
  });
}
