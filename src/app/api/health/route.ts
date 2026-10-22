import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { MEETINGS_BUCKET, storage } from "@/lib/storage";

type Check = { ok: true } | { ok: false; error: string };

// Read-only checks, so it is safe to leave deployed. Errors report the error
// name only, never connection details.
async function check(run: () => Promise<unknown>): Promise<Check> {
  try {
    await run();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.name : "UnknownError" };
  }
}

export async function GET() {
  await connection();

  const [database, objectStorage] = await Promise.all([
    check(() => db().$queryRaw`SELECT 1`),
    check(() => storage().send(new HeadBucketCommand({ Bucket: MEETINGS_BUCKET }))),
  ]);

  const ok = database.ok && objectStorage.ok;
  return Response.json({ ok, database, objectStorage }, { status: ok ? 200 : 503 });
}
