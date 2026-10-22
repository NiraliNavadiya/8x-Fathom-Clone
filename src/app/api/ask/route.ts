import { z } from "zod";
import { askMeetly, askRequestSchema } from "@/lib/ask";
import { handleError, jsonError, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (body instanceof Response) return body;
  try {
    return Response.json(await askMeetly(askRequestSchema.parse(body)));
  } catch (error) {
    if (error instanceof z.ZodError) return handleError(error);
    console.error("Ask Meetly failed", error);
    return jsonError(502, "Ask Meetly couldn't get an answer. Try again in a moment.");
  }
}
