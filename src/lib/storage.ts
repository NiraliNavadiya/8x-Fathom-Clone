import "server-only";

import { S3Client } from "@aws-sdk/client-s3";
import { storageEnv } from "@/lib/env";

// Neon Object Storage is S3-compatible. Each Neon branch has its own endpoint.
let client: S3Client | undefined;

export function storage(): S3Client {
  if (!client) {
    const env = storageEnv();
    client = new S3Client({
      region: env.AWS_REGION,
      endpoint: env.AWS_ENDPOINT_URL_S3,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
      // Neon supports path-style addressing only.
      forcePathStyle: true,
      // Otherwise presigned PUT URLs embed a checksum of an empty body and uploads fail.
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }
  return client;
}

// Declared in neon.ts; every Neon branch has a bucket with this name.
export const MEETINGS_BUCKET = "assets";
