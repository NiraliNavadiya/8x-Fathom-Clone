import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { anthropicEnv } from "@/lib/env";

// Used for meeting summaries and Ask Meetly.
export const CLAUDE_MODEL = "claude-opus-5-5";

let client: Anthropic | undefined;

export function anthropic(): Anthropic {
  return (client ??= new Anthropic({ apiKey: anthropicEnv().ANTHROPIC_API_KEY }));
}
