-- Milestone 2 Stage 2: editing a saved game (PRD criteria 115–123).
--
-- `editing_game_id` is the one bit that tells the save transaction to update an
-- existing game in place rather than insert a new one. It is nullable and
-- **deliberately carries no REFERENCES clause** — see the comment on
-- `draft.editingGameId` in lib/db/schema.ts: an edit draft has to remain
-- representable after its target game is deleted, so that saving it can fail
-- cleanly (criterion 122) instead of blocking the delete or quietly becoming a
-- new-game draft that resurrects the game under a fresh id.
--
-- The partial unique index is the database-level backstop for "one open edit per
-- game": a second `POST /api/games/{id}/edit` for the same game resumes the
-- existing draft rather than forking a rival one, and a double tap loses the
-- race here rather than in application code.
ALTER TABLE `draft` ADD `editing_game_id` text;--> statement-breakpoint
CREATE INDEX `draft_editing_game_idx` ON `draft` (`editing_game_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `draft_one_open_edit_per_game` ON `draft` (`editing_game_id`) WHERE "draft"."editing_game_id" IS NOT NULL AND "draft"."saved_game_id" IS NULL;
