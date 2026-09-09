import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // convex-test runs functions in a Convex-like isolate, not Node.
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    include: ["convex/**/*.test.ts"],
  },
});
