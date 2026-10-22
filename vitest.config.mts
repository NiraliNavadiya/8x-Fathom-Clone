import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path("./src"),
      // Next.js provides `server-only`; outside Next it is a no-op.
      "server-only": path("./src/test/server-only.ts"),
    },
  },
  test: {
    // Node by default; component tests opt in with `// @vitest-environment jsdom`.
    environment: "node",
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/**/*.integration.test.ts"],
        },
      },
      {
        // Hits the real Neon branch in .env.local: `npm run test:integration`.
        extends: true,
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.ts"],
          setupFiles: ["./src/test/load-env.ts"],
          testTimeout: 30_000,
        },
      },
    ],
  },
});
