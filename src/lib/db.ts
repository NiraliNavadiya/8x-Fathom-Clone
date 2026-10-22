import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";
import { databaseEnv } from "@/lib/env";

// Neon's guidance for Vercel: node-postgres with a pool that Fluid compute can
// drain before a function instance is suspended.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Neon URLs say sslmode=require, which pg currently treats as verify-full and
// warns will weaken in pg 9. Pin verify-full so certificates stay verified.
export function withVerifiedTls(connectionString: string): string {
  const url = new URL(connectionString);
  const mode = url.searchParams.get("sslmode");
  if (!mode || mode === "prefer" || mode === "require" || mode === "verify-ca") {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

export function db(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const pool = new Pool({ connectionString: withVerifiedTls(databaseEnv().DATABASE_URL) });
    attachDatabasePool(pool);
    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg(pool),
      // Opening a connection can take a few seconds when Neon wakes from
      // scale-to-zero, longer than Prisma's 2s default wait for a transaction.
      transactionOptions: { maxWait: 10_000, timeout: 15_000 },
    });
  }
  return globalForPrisma.prisma;
}
