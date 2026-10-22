import { jsonError } from "@/lib/http";
import { getMeeting } from "@/lib/meetings";

export async function GET(_request: Request, { params }: RouteContext<"/api/meetings/[id]">) {
  const { id } = await params;
  const meeting = await getMeeting(id);
  return meeting ? Response.json({ meeting }) : jsonError(404, "Meeting not found");
}
