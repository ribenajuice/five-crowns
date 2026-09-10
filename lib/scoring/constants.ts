/**
 * Five Crowns scoring constants.
 *
 * Pure, dependency-free. Nothing in `lib/scoring` may import AWS, the
 * database, Next.js or the network (docs/ARCHITECTURE.md § Repository layout).
 */

/**
 * Every game is exactly eleven hands: hand 1 is the 3s, hand 11 is Kings.
 * The hands are positional — nothing on the pad labels them.
 */
export const HANDS_PER_GAME = 11;

/** A one-player game is a transcription failure, not a game. */
export const MIN_PLAYERS = 2;

/** Running totals are 0–999 in practice; anything outside that is a misread. */
export const MAX_RUNNING_TOTAL = 999;

/**
 * Hand labels, by position. Presentation only — the integer 1–11 is what is
 * stored (docs/ARCHITECTURE.md § Data model, `round_score.hand`).
 */
export const HAND_LABELS = [
  "3s",
  "4s",
  "5s",
  "6s",
  "7s",
  "8s",
  "9s",
  "10s",
  "Jacks",
  "Queens",
  "Kings",
] as const;

export type HandLabel = (typeof HAND_LABELS)[number];

/** 1-based hand number → its label. Returns undefined outside 1–11. */
export function handLabel(hand: number): HandLabel | undefined {
  return HAND_LABELS[hand - 1];
}
