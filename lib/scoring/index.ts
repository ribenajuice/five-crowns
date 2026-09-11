/**
 * The scoring library — the heart of the product.
 *
 * Pure, dependency-free, and unit tested against both verified fixture grids.
 * Nothing in here touches AWS, the network, the database or Next.js, so it can
 * be exercised with no cloud at all (docs/ARCHITECTURE.md § Repository layout).
 *
 * The server re-runs every one of these on save. It never accepts a delta, a
 * final score or a winner computed by the browser.
 */

export * from "./constants";
export * from "./monotonicity";
export * from "./hands";
export * from "./winners";
export * from "./roster";
export * from "./validate";
