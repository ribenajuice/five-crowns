-- SQLite refuses `ADD COLUMN ... NOT NULL` with no default the moment a table
-- has any rows ("Cannot add a NOT NULL column with default value NULL"). The
-- temporary `DEFAULT ''` below exists only to get the column added; every row
-- is then backfilled with its real name_key, and the application always
-- supplies an explicit one on insert (`lib/db/schema.ts` declares no default,
-- matching `location.name_key`) — the `''` default is dead weight kept only
-- because SQLite has no `ALTER COLUMN DROP DEFAULT` short of a table rebuild.
ALTER TABLE `player` ADD `name_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `player` SET `name_key` = lower(trim(`display_name`)) WHERE `name_key` = '';--> statement-breakpoint
CREATE UNIQUE INDEX `player_name_key_unique` ON `player` (`name_key`);--> statement-breakpoint
ALTER TABLE `usage_day` ADD `sheet_uploads` integer DEFAULT 0 NOT NULL;
