/**
 * The password gate.
 *
 * One shared group password for the record, a second independent password for
 * `/admin`. No accounts, no per-user identity, nothing recording who did what —
 * all three accepted explicitly by the PRD, with the exposure written down in
 * `docs/DECISIONS.md`.
 *
 * ⚠️ What this protects against, honestly: search engines, random visitors and
 * anyone who stumbles on the URL. Anyone the password is texted to can read,
 * edit and delete everything.
 */

export * from "./client-ip";
export * from "./cookies";
export * from "./ip-hash";
export * from "./password";
export * from "./secret";
export * from "./token";
