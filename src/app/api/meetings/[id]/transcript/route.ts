import { handleError, jsonError, readJson } from "@/lib/http";
import { getMeeting, saveTranscript } from "@/lib/meetings";

type Context = RouteContext<"/api/meetings/[id]/transcript">;

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const meeting = await getMeeting(id);
  if (!meeting) return jsonError(404, "Meeting not found");
  if (!meeting.transcript) return jsonError(404, "Meeting has no transcript yet");
  return Response.json({ transcript: meeting.transcript });
}

// Creates or replaces the transcript.
export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await readJson(request);
  if (body instanceof Response) return body;

  try {
    const transcript = await saveTranscript(id, body as Parameters<typeof saveTranscript>[1]);
    return transcript ? Response.json({ transcript }) : jsonError(404, "Meeting not found");
  } catch (error) {
    return handleError(error);
  }
}
