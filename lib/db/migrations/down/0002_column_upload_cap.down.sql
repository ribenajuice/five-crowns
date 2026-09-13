-- Reverses lib/db/migrations/0002_column_upload_cap.sql.
--
-- Applied by hand:
--
--   sqlite3 .data/five-crowns.db < lib/db/migrations/down/0002_column_upload_cap.down.sql
--
-- and remember to remove the matching row from __drizzle_migrations.

ALTER TABLE `usage_day` DROP COLUMN `column_uploads`;
