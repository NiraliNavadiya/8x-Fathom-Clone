import { z } from "zod";

export function jsonError(status: number, error: string, details?: unknown) {
  return Response.json(details === undefined ? { error } : { error, details }, { status });
}

// Parses a JSON body; returns a 400 response instead of throwing on bad input.
export async function readJson(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return jsonError(400, "Request body must be valid JSON");
  }
}

// Turns validation errors into 400s; anything else is rethrown as a 500.
export function handleError(error: unknown): Response {
  if (error instanceof z.ZodError) {
    return jsonError(400, "Invalid request", z.flattenError(error).fieldErrors);
  }
  throw error;
}
