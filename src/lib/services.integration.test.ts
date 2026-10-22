import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { MEETINGS_BUCKET, storage } from "@/lib/storage";

afterAll(async () => {
  await db().$disconnect();
});

describe("Neon Postgres", () => {
  it("writes and reads a row without leaving data behind", async () => {
    const value = randomUUID();
    const rows = await db().$transaction(async (tx) => {
      await tx.$executeRaw`CREATE TEMP TABLE setup_check (value text) ON COMMIT DROP`;
      await tx.$executeRaw`INSERT INTO setup_check (value) VALUES (${value})`;
      return tx.$queryRaw<{ value: string }[]>`SELECT value FROM setup_check`;
    });
    expect(rows).toEqual([{ value }]);
  });
});

describe("Neon Object Storage", () => {
  it("uploads, downloads and deletes an object", async () => {
    const Key = `setup-check/${randomUUID()}.txt`;
    const body = `meetly storage check ${Key}`;
    const s3 = storage();

    await s3.send(
      new PutObjectCommand({ Bucket: MEETINGS_BUCKET, Key, Body: body, ContentType: "text/plain" }),
    );
    try {
      const res = await s3.send(new GetObjectCommand({ Bucket: MEETINGS_BUCKET, Key }));
      expect(await res.Body?.transformToString()).toBe(body);
    } finally {
      await s3.send(new DeleteObjectCommand({ Bucket: MEETINGS_BUCKET, Key }));
    }

    await expect(
      s3.send(new HeadObjectCommand({ Bucket: MEETINGS_BUCKET, Key })),
    ).rejects.toMatchObject({ name: "NotFound" });
  });
});
