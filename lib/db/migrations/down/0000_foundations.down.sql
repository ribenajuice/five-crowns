-- Reverses lib/db/migrations/0000_foundations.sql.
--
-- Drizzle Kit only generates the forward direction, so every migration in this
-- project gets a hand-written companion here. Dropped in reverse dependency
-- order. Applied by hand:
--
--   sqlite3 .data/five-crowns.db < lib/db/migrations/down/0000_foundations.down.sql
--
-- and remember to remove the matching row from __drizzle_migrations.

DROP TABLE IF EXISTS `usage_day`;
DROP TABLE IF EXISTS `login_attempt`;
DROP TABLE IF EXISTS `transcription`;
DROP TABLE IF EXISTS `photo`;
DROP TABLE IF EXISTS `draft`;
DROP TABLE IF EXISTS `round_score`;
DROP TABLE IF EXISTS `game_player`;
DROP TABLE IF EXISTS `game`;
DROP TABLE IF EXISTS `roster_member`;
DROP TABLE IF EXISTS `roster`;
DROP TABLE IF EXISTS `location`;
DROP TABLE IF EXISTS `player`;
