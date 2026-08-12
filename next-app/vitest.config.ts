import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Everything under test is pure logic (grading, missed pool, timer) —
    // no DOM needed, so the node environment keeps runs fast.
    environment: "node",
    include: ["src/**/*.test.ts"],
    // No suites exist until the grading/missed-pool logic lands; without this
    // `npm test` exits non-zero on an empty run.
    passWithNoTests: true,
  },
});
