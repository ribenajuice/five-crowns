/**
 * The Five Crowns Ledger schema.
 *
 * Authoritative once code exists; `docs/ARCHITECTURE.md` § Data model is the
 * conceptual version and the two must not disagree.
 *
 * ⚠️ **No secret is ever stored in the database.** Not the Anthropic API key,
 * not either password hash, not the cookie signing secret. They live in SSM
 * Parameter Store as SecureStrings and there is deliberately no table they
 * could be in — so no export, neither the admin panel's download nor the
 * nightly dump, can ever contain one, however the export is written
 * (docs/ARCHITECTURE.md § The admin panel, "The hazard that drives the whole
 * design"; PRD criterion 79). Adding a secret-bearing column here is a
 * structural regression, not a style preference.
 */

import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** ISO 8601 timestamps: readable in a CSV export with no tools at all. */
const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);

/* ------------------------------------------------------------------ people */

/**
 * A *person*, persisting across every game they ever play. Individual stats
 * hang off this and nothing else — fracturing a player silently corrupts every
 * stat that mentions them, which is why M1 forces every column name to be
 * picked from a list rather than typed free-hand.
 */
export const player = sqliteTable(
  "player",
  {
    id: text("id").primaryKey(),
    displayName: text("display_name").notNull(),
    slug: text("slug").notNull(),
    /** Milestone 2 player merge. Null for everyone until then. */
    mergedIntoId: text("merged_into_id"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("player_slug_unique").on(t.slug)],
);

/**
 * Where a game was played. A table, not a text column on `game`, for exactly
 * the reason `player` is a table: free text fractures one venue into three and
 * every location stat is then quietly wrong.
 */
export const location = sqliteTable(
  "location",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    /** Lowercased, trimmed, whitespace collapsed. The typo backstop. */
    nameKey: text("name_key").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("location_name_key_unique").on(t.nameKey),
    uniqueIndex("location_slug_unique").on(t.slug),
  ],
);

/* ----------------------------------------------------------------- rosters */

/**
 * The exact, order-independent set of players in a game.
 *
 * `signature` is the members' ids sorted ascending and joined with ':' — see
 * `lib/scoring/roster.ts`. The UNIQUE index *is* the "created the first time,
 * reused silently after" behaviour; the save handler upserts on it.
 */
export const roster = sqliteTable(
  "roster",
  {
    id: text("id").primaryKey(),
    signature: text("signature").notNull(),
    size: integer("size").notNull(),
    /** Null until someone renames it; the UI renders an auto-name from members. */
    name: text("name"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("roster_signature_unique").on(t.signature),
    index("roster_size_idx").on(t.size),
  ],
);

export const rosterMember = sqliteTable(
  "roster_member",
  {
    rosterId: text("roster_id")
      .notNull()
      .references(() => roster.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => player.id),
  },
  (t) => [
    primaryKey({ columns: [t.rosterId, t.playerId] }),
    index("roster_member_player_idx").on(t.playerId),
  ],
);

/* ------------------------------------------------------------------- games */

/**
 * One night, one sheet.
 *
 * ⚠️ **No stored winner, deliberately.** Lowest final total wins and ties are
 * shared, so a game can have more than one winner — and a saved game can be
 * edited, so a stored winner would drift out of step with the numbers on the
 * first correction. Who won is derived from `game_player.final_score` every
 * time. ⚠️ **No `is_manual` flag either**: a typed game is the same game.
 */
export const game = sqliteTable(
  "game",
  {
    id: text("id").primaryKey(),
    /** ISO date. Read off the sheet if written there, else today. Always editable. */
    playedOn: text("played_on").notNull(),
    /** Nullable: a save is never blocked for want of a location. */
    locationId: text("location_id").references(() => location.id),
    rosterId: text("roster_id")
      .notNull()
      .references(() => roster.id),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [
    index("game_played_on_idx").on(t.playedOn),
    index("game_roster_idx").on(t.rosterId),
    index("game_location_idx").on(t.locationId),
  ],
);

/** One player's participation in one game. */
export const gamePlayer = sqliteTable(
  "game_player",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => game.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => player.id),
    /** Which column they occupied, so the game view redisplays in paper order. */
    columnOrder: integer("column_order").notNull(),
    /** The handwritten name exactly as transcribed, so an identity mistake is traceable. */
    sheetName: text("sheet_name"),
    /** The last running total. Denormalised for cheap winner and stats queries. */
    finalScore: integer("final_score").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.gameId, t.playerId] }),
    index("game_player_player_idx").on(t.playerId),
    index("game_player_final_score_idx").on(t.finalScore),
  ],
);

/**
 * One player's hand in one game. Both numbers are stored on purpose.
 *
 * `running_total` is the artifact a human actually verified against the paper.
 * `score` is derived from it. Keeping both lets the record be re-derived if the
 * delta logic ever changes, and renders the game view exactly like the paper
 * with no cumulative sum in the query.
 *
 * The "exactly 11 hands" rule is enforced in the save handler, not here, so PRD
 * open question 2 can be answered later without a migration.
 */
export const roundScore = sqliteTable(
  "round_score",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => game.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => player.id),
    /** 1 = the 3s hand … 11 = Kings. Positional; nothing on the pad labels them. */
    hand: integer("hand").notNull(),
    /** The number actually written on the pad. */
    runningTotal: integer("running_total").notNull(),
    /** Derived: running_total(1) for hand 1, then the gap. */
    score: integer("score").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.gameId, t.playerId, t.hand] }),
    index("round_score_hand_idx").on(t.hand),
    index("round_score_player_idx").on(t.playerId),
  ],
);

/* ------------------------------------------------------------- the evidence */

/**
 * A game has one primary sheet photo and zero or more column close-ups.
 *
 * Close-ups are kept permanently even when their reading was rejected: they are
 * further evidence of what the paper said, and rejecting a reading says nothing
 * about the photo's value as evidence.
 */
export const photo = sqliteTable(
  "photo",
  {
    id: text("id").primaryKey(),
    /** 'sheet' — the whole finished pad. 'column' — a close-up of one column. */
    kind: text("kind", { enum: ["sheet", "column"] }).notNull(),
    /** Both nullable: a photo exists from the moment it is presigned, before any game. */
    draftId: text("draft_id"),
    gameId: text("game_id").references(() => game.id),
    /** Set on a 'column' photo at save time, so the game view can attach it. */
    playerId: text("player_id").references(() => player.id),
    /** Which draft column it was shot for, before players are resolved. */
    draftColumnId: text("draft_column_id"),
    s3KeyOriginal: text("s3_key_original").notNull(),
    s3KeyModel: text("s3_key_model").notNull(),
    width: integer("width"),
    height: integer("height"),
    bytes: integer("bytes"),
    /** 0/90/180/270 — what the user turned the image by, so it shows the same way round. */
    rotationApplied: integer("rotation_applied").notNull().default(0),
    /** Capture order, for stable display. */
    sequence: integer("sequence").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("photo_game_idx").on(t.gameId),
    index("photo_draft_idx").on(t.draftId),
    // Exactly one sheet photo per game. Close-ups are unconstrained.
    uniqueIndex("photo_one_sheet_per_game")
      .on(t.gameId)
      .where(sql`${t.kind} = 'sheet' AND ${t.gameId} IS NOT NULL`),
  ],
);

/**
 * One row per vision attempt, kept forever — success, invalid or error.
 *
 * The only way to ever answer "is the new model better than the old one on
 * *our* sheets?", and "how often does a close-up beat the full-sheet read?".
 *
 * ⚠️ `raw_json` holds the model's response. It must never hold the request
 * credentials, and no code path may write an API key into it.
 */
export const transcription = sqliteTable(
  "transcription",
  {
    id: text("id").primaryKey(),
    photoId: text("photo_id")
      .notNull()
      .references(() => photo.id, { onDelete: "cascade" }),
    /** The two paths have different prompts and output schemas. */
    kind: text("kind", { enum: ["sheet", "column"] }).notNull(),
    model: text("model").notNull(),
    status: text("status", { enum: ["ok", "invalid", "error"] }).notNull(),
    rawJson: text("raw_json"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    latencyMs: integer("latency_ms"),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [
    index("transcription_photo_idx").on(t.photoId),
    index("transcription_created_idx").on(t.createdAt),
  ],
);

/**
 * An in-progress review, persisted server-side.
 *
 * ⚠️ It exists because on iOS opening the camera can evict the web page from
 * memory, and the whole re-photograph feature is "go and open the camera".
 * Client-only review state would lose every correction already made.
 */
export const draft = sqliteTable(
  "draft",
  {
    id: text("id").primaryKey(),
    stateJson: text("state_json").notNull(),
    savedGameId: text("saved_game_id").references(() => game.id),
    createdAt: createdAt(),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (t) => [index("draft_updated_idx").on(t.updatedAt)],
);

/* --------------------------------------------------------- abuse and money */

/**
 * The daily transcription cap — the mitigation for the one exposure that costs
 * real cash if the shared password leaks.
 *
 * ⚠️ Sheet reads and column re-reads are counted **separately**, so a
 * legitimate session re-shooting five columns cannot trip a cap meant to stop a
 * leaked password.
 */
export const usageDay = sqliteTable("usage_day", {
  /** ISO date, UTC. */
  day: text("day").primaryKey(),
  sheetTranscriptions: integer("sheet_transcriptions").notNull().default(0),
  columnTranscriptions: integer("column_transcriptions").notNull().default(0),
});

/**
 * Crude login rate limiting.
 *
 * ⚠️ `ip_hash` is an HMAC of the caller's address, never the address itself —
 * there is no reason to keep a list of people's IPs in a file the founder can
 * download. `scope` separates group logins from admin logins so one cannot lock
 * out the other.
 */
export const loginAttempt = sqliteTable(
  "login_attempt",
  {
    ipHash: text("ip_hash").notNull(),
    scope: text("scope", { enum: ["group", "admin"] }).notNull(),
    /** Unix minutes: floor(epoch_ms / 60000). */
    minuteBucket: integer("minute_bucket").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.ipHash, t.scope, t.minuteBucket] }),
    index("login_attempt_bucket_idx").on(t.minuteBucket),
  ],
);

/* --------------------------------------------------------------- relations */

export const playerRelations = relations(player, ({ many }) => ({
  gamePlayers: many(gamePlayer),
  roundScores: many(roundScore),
  rosterMembers: many(rosterMember),
}));

export const locationRelations = relations(location, ({ many }) => ({
  games: many(game),
}));

export const rosterRelations = relations(roster, ({ many }) => ({
  members: many(rosterMember),
  games: many(game),
}));

export const rosterMemberRelations = relations(rosterMember, ({ one }) => ({
  roster: one(roster, {
    fields: [rosterMember.rosterId],
    references: [roster.id],
  }),
  player: one(player, {
    fields: [rosterMember.playerId],
    references: [player.id],
  }),
}));

export const gameRelations = relations(game, ({ one, many }) => ({
  location: one(location, {
    fields: [game.locationId],
    references: [location.id],
  }),
  roster: one(roster, { fields: [game.rosterId], references: [roster.id] }),
  players: many(gamePlayer),
  rounds: many(roundScore),
  photos: many(photo),
}));

export const gamePlayerRelations = relations(gamePlayer, ({ one }) => ({
  game: one(game, { fields: [gamePlayer.gameId], references: [game.id] }),
  player: one(player, {
    fields: [gamePlayer.playerId],
    references: [player.id],
  }),
}));

export const roundScoreRelations = relations(roundScore, ({ one }) => ({
  game: one(game, { fields: [roundScore.gameId], references: [game.id] }),
  player: one(player, {
    fields: [roundScore.playerId],
    references: [player.id],
  }),
}));

export const photoRelations = relations(photo, ({ one, many }) => ({
  game: one(game, { fields: [photo.gameId], references: [game.id] }),
  player: one(player, { fields: [photo.playerId], references: [player.id] }),
  transcriptions: many(transcription),
}));

export const transcriptionRelations = relations(transcription, ({ one }) => ({
  photo: one(photo, {
    fields: [transcription.photoId],
    references: [photo.id],
  }),
}));

/* ------------------------------------------------------------------- types */

export type Player = typeof player.$inferSelect;
export type NewPlayer = typeof player.$inferInsert;
export type Location = typeof location.$inferSelect;
export type Roster = typeof roster.$inferSelect;
export type Game = typeof game.$inferSelect;
export type GamePlayer = typeof gamePlayer.$inferSelect;
export type RoundScore = typeof roundScore.$inferSelect;
export type Photo = typeof photo.$inferSelect;
export type Transcription = typeof transcription.$inferSelect;
export type Draft = typeof draft.$inferSelect;
export type UsageDay = typeof usageDay.$inferSelect;
export type LoginAttempt = typeof loginAttempt.$inferSelect;

/**
 * Every table in the record, in dependency order.
 *
 * Used by the nightly dump and the admin panel's CSV export. ⚠️ It is the
 * complete list on purpose: an export written from this constant cannot leak a
 * secret, because no table here holds one.
 */
export const ALL_TABLES = [
  "player",
  "location",
  "roster",
  "roster_member",
  "game",
  "game_player",
  "round_score",
  "photo",
  "transcription",
  "draft",
  "usage_day",
  "login_attempt",
] as const;
