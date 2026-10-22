import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma does not load env files itself. Read the same files Next.js does;
// the first file that defines a variable wins.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct connection; Neon's pooled URL is for the app.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  },
});
