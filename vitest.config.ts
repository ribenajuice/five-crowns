import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Regex, not a bare "@" string: a string alias is prefix-matched, so "@"
      // would also swallow every "@aws-sdk/..." import.
      { find: /^@\//, replacement: root },
      {
        find: /^server-only$/,
        replacement: `${root}tests/stubs/server-only.ts`,
      },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // No AWS, no network, no shared state between files.
    fileParallelism: true,
  },
});
