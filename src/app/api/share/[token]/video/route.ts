import { jsonError } from "@/lib/http";
import { getMeetingVideoKey } from "@/lib/meetings";
import { meetingIdForToken } from "@/lib/shares";
import { videoUrl } from "@/lib/videos";

// The shared page's video. Checks the link is still active, then redirects
// to a short-lived presigned storage URL, as the owner's video route does.
export async function GET(_request: Request, { params }: RouteContext<"/api/share/[token]/video">) {
  const { token } = await params;
  const meetingId = await meetingIdForToken(token);
  const key = meetingId && (await getMeetingVideoKey(meetingId));
  if (!key) return jsonError(404, "This link is no longer available");

  return new Response(null, {
    status: 302,
    headers: { Location: await videoUrl(key), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
