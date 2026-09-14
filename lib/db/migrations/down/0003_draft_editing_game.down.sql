-- Reverses lib/db/migrations/0003_draft_editing_game.sql.
--
-- Applied by hand:
--
--   sqlite3 .data/five-crowns.db < lib/db/migrations/down/0003_draft_editing_game.down.sql
--
-- and remember to remove the matching row from __drizzle_migrations.
--
-- ⚠️ Any open edit draft is orphaned by this, not deleted: it loses the only
-- thing marking it as an edit and would save as a *new* game. Delete those rows
-- first if this is ever run against a database people are using:
--
--   DELETE FROM draft WHERE editing_game_id IS NOT NULL AND saved_game_id IS NULL;

DROP INDEX IF EXISTS `draft_one_open_edit_per_game`;
DROP INDEX IF EXISTS `draft_editing_game_idx`;
ALTER TABLE `draft` DROP COLUMN `editing_game_id`;
