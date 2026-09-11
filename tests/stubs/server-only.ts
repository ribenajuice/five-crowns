/**
 * `server-only` throws on import outside a React Server Component graph, which
 * is exactly what it is for — and exactly what stops a unit test importing a
 * module that legitimately uses it. Aliased to this no-op in `vitest.config.ts`.
 * The real guard is still in force in every build.
 */
export {};
