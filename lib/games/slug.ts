/**
 * Slugs for players and locations created at save time.
 *
 * Both `player.slug` and `location.slug` carry a `UNIQUE` index, so every slug
 * is minted with a short random suffix rather than checked for collision —
 * simpler than a retry loop, and at this volume (a few hundred games, a
 * handful of people and venues, ever) the chance of a real collision is
 * negligible.
 */

import { randomBytes } from "node:crypto";

export function slugify(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "entry";
}

/** `${slugify(name)}-${8 hex chars}` — unique enough not to check. */
export function uniqueSlug(name: string): string {
  return `${slugify(name)}-${randomBytes(4).toString("hex")}`;
}
