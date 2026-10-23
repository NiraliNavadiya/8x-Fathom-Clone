import { z } from "zod";

// Each service validates only the variables it needs, on first use, so the app
// builds without secrets and a missing storage key doesn't break the database.

const databaseSchema = z.object({
  DATABASE_URL: z.url(),
});

const storageSchema = z.object({
  AWS_ENDPOINT_URL_S3: z.url(),
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
});

const anthropicSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
});

const geminiSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-flash-latest"),
});

const shareSchema = z.object({
  SHARE_LINK_SECRET: z.string().min(32, "SHARE_LINK_SECRET must be at least 32 characters"),
});

type EnvSource = Record<string, string | undefined>;

// Error messages name the offending variables but never include their values.
export function parseEnv<T extends z.ZodObject>(
  schema: T,
  source: EnvSource,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((i) => i.path.join(".")))];
    throw new Error(
      `Missing or invalid environment variables: ${names.join(", ")}. See .env.example.`,
    );
  }
  return result.data;
}

function lazy<T extends z.ZodObject>(schema: T) {
  let cached: z.infer<T> | undefined;
  return () => (cached ??= parseEnv(schema, process.env));
}

export const databaseEnv = lazy(databaseSchema);
export const storageEnv = lazy(storageSchema);
export const anthropicEnv = lazy(anthropicSchema);
export const geminiEnv = lazy(geminiSchema);
export const shareEnv = lazy(shareSchema);

export const schemas = { databaseSchema, storageSchema, anthropicSchema, geminiSchema, shareSchema };
