import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Dummy connection string so the lazy Prisma/Neon pool can be constructed
    // at import time. Pure-function tests never actually open a connection.
    env: {
      DATABASE_URL: "postgresql://u:p@localhost:5432/test?sslmode=disable",
      OVERPASS_ENDPOINT: "https://overpass-api.de/api/interpreter",
    },
  },
});
