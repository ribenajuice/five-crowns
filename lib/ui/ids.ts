/**
 * Client-generated ids.
 *
 * Draft column ids are generated here and must be stable across reordering
 * (`lib/draft/state.ts`) — `crypto.randomUUID()` is available in every browser
 * this app targets, same as the server side of the contract.
 */

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
