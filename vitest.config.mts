import { defineConfig } from "vitest/config";

export default defineConfig({
  // `.mts` so Vite loads this as ESM natively, and tsconfig path
  // resolution is built in now — no vite-tsconfig-paths plugin needed.
  resolve: {
    tsconfigPaths: true,
    alias: {
      // See test/server-only-stub.ts.
      "server-only": new URL("./test/server-only-stub.ts", import.meta.url)
        .pathname,
    },
  },
  test: {
    // Unit tests cover pure logic — mappers, schemas, URL builders.
    // Anything touching next/headers, Prisma or the network belongs in
    // an E2E test instead.
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
