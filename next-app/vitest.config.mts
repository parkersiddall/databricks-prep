import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Must stay `.mts`: package.json has no "type": "module", so Vite would load a
// `.ts` config as CommonJS and warn about the ESM syntax below.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Everything under test is pure logic (content validation, grading, missed
    // pool, timer) — no DOM needed, so the node environment keeps runs fast.
    environment: "node",
    // Tests live in tests/, mirroring src/, so src/ holds only shipping code.
    include: ["tests/**/*.test.ts"],
  },
});
