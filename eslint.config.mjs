import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    ignores: [
      ".next/**",
      ".sst/**",
      "node_modules/**",
      "next-env.d.ts",
      // Types for the SST globals ($config, sst, aws) are generated into the
      // gitignored .sst/platform by `npx sst install`, so this file cannot be
      // linted or typechecked in a clean checkout. Reviewed by hand instead.
      "sst.config.ts",
      "lib/db/migrations/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["lib/config/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db", "@/lib/db/*", "../db", "../db/*"],
              message:
                "No secret is ever stored in the database (docs/ARCHITECTURE.md). lib/config must not import the database layer.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/scoring/**/*.ts"],
    rules: {
      // The scoring library is pure and dependency-free so it can be unit
      // tested without AWS, a network or a database.
      "no-restricted-imports": ["error", { patterns: ["@/lib/db*", "@/lib/config*", "@/lib/auth*", "@aws-sdk/*", "next/*"] }],
    },
  },
];

export default config;
