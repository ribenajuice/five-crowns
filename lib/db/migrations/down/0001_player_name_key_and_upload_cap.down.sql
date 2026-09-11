-- Reverses lib/db/migrations/0001_player_name_key_and_upload_cap.sql.
--
-- Applied by hand:
--
--   sqlite3 .data/five-crowns.db < lib/db/migrations/down/0001_player_name_key_and_upload_cap.down.sql
--
-- and remember to remove the matching row from __drizzle_migrations.

DROP INDEX IF EXISTS `player_name_key_unique`;
ALTER TABLE `player` DROP COLUMN `name_key`;
ALTER TABLE `usage_day` DROP COLUMN `sheet_uploads`;
