/**
 * Day-of-week and calendar-month derivation — PRD criteria 255, 265–266.
 *
 * ⚠️ **No `Date` object anywhere in this file, on purpose** (criterion 255):
 * `played_on` is a calendar date, not an instant, so the weekday and the
 * month it falls on are read from the stored `YYYY-MM-DD` string with plain
 * arithmetic (Zeller's congruence for the weekday) rather than by
 * constructing a `Date` and reading it back — the exact move that would let
 * the runtime's own timezone shift a Saturday game to a Friday for someone
 * running the app from `America/Los_Angeles`. The same game must read as the
 * same weekday everywhere, and this file's only inputs are three integers
 * parsed out of the string itself.
 *
 * `averageFinalScore` (`./records.ts`, criterion 178/223) is reused for the
 * mean in each row — no second mean is written here (criterion 250's rule,
 * extended to this stage's own two tables).
 */

import { averageFinalScore } from "./records";

/** Monday first (criterion 265's own fixed order) — index 0–6. */
export const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
export type WeekdayLabel = (typeof WEEKDAY_LABELS)[number];

/** January first (criterion 266's own fixed order) — index 0–11. */
export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
export type MonthLabel = (typeof MONTH_LABELS)[number];

const PLAYED_ON_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * 0 = Monday … 6 = Sunday, read straight off the `YYYY-MM-DD` string via
 * Zeller's congruence (Gregorian calendar) — no `Date` object constructed at
 * any point (criterion 255). Throws on a value that isn't a calendar date;
 * every stored `game.played_on` is one (`lib/scoring/validate.ts`'s own
 * boundary), so this is defensive, not a real production path.
 */
export function weekdayIndex(playedOn: string): number {
  const match = PLAYED_ON_PATTERN.exec(playedOn);
  if (!match) throw new Error(`Not a calendar date: ${playedOn}`);

  const year = Number(match[1]);
  const rawMonth = Number(match[2]);
  const day = Number(match[3]);

  // Zeller's congruence treats January and February as months 13 and 14 of
  // the *previous* year.
  const month = rawMonth < 3 ? rawMonth + 12 : rawMonth;
  const adjustedYear = rawMonth < 3 ? year - 1 : year;

  const centuryYear = adjustedYear % 100;
  const century = Math.floor(adjustedYear / 100);

  const h =
    (day +
      Math.floor((13 * (month + 1)) / 5) +
      centuryYear +
      Math.floor(centuryYear / 4) +
      Math.floor(century / 4) +
      5 * century) %
    7;
  // h: 0 = Saturday, 1 = Sunday, 2 = Monday, … 6 = Friday. Shift to this
  // module's own 0 = Monday … 6 = Sunday.
  return (h + 5) % 7;
}

/** 0 = January … 11 = December, read straight off the `YYYY-MM-DD` string. */
export function monthIndex(playedOn: string): number {
  const match = PLAYED_ON_PATTERN.exec(playedOn);
  if (!match) throw new Error(`Not a calendar date: ${playedOn}`);
  return Number(match[2]) - 1;
}

/** One `game_player` row's worth of what a time slice needs. */
export interface TimeSliceInput {
  gameId: string;
  playedOn: string;
  finalScore: number;
}

export interface TimeSliceRow {
  label: string;
  /** Distinct games played in this slice — never a row count of `final_score`s. */
  gamesPlayed: number;
  /** How many final scores that mean is drawn from (criterion 224's dual-sample convention). */
  scoresCount: number;
  /** `null` — never `0` — for a slice with no games (criteria 265–266's own no-data rule). */
  average: number | null;
}

function buildTimeSliceTable(
  rows: readonly TimeSliceInput[],
  labels: readonly string[],
  indexOf: (playedOn: string) => number,
): TimeSliceRow[] {
  const gameIdsByIndex: Set<string>[] = labels.map(() => new Set());
  const scoresByIndex: number[][] = labels.map(() => []);

  for (const row of rows) {
    const i = indexOf(row.playedOn);
    gameIdsByIndex[i]!.add(row.gameId);
    scoresByIndex[i]!.push(row.finalScore);
  }

  return labels.map((label, i) => {
    const scores = scoresByIndex[i]!;
    const avg = averageFinalScore(scores);
    return {
      label,
      gamesPlayed: gameIdsByIndex[i]!.size,
      scoresCount: scores.length,
      average: avg ? avg.average : null,
    };
  });
}

/** Criterion 265 — seven rows, Monday through Sunday, always all present. */
export function dayOfWeekTable(rows: readonly TimeSliceInput[]): TimeSliceRow[] {
  return buildTimeSliceTable(rows, WEEKDAY_LABELS, weekdayIndex);
}

/** Criterion 266 — twelve rows, January through December, always all present. */
export function timeOfYearTable(rows: readonly TimeSliceInput[]): TimeSliceRow[] {
  return buildTimeSliceTable(rows, MONTH_LABELS, monthIndex);
}
