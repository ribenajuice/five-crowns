-- Milestone 2 Stage 4 (PRD criterion 158): `merged_into_id` was an unused
-- placeholder reserved at kickoff for a reversible player merge. The founder's
-- decision (`docs/DECISIONS.md`, 2026-09-14) is that merges are permanent, like
-- a game delete — a populated `merged_into_id` **is** a merge history, exactly
-- what that decision says not to keep. `lib/players/merge.ts` hard-deletes the
-- losing `player` row instead, so this column is dropped rather than used.
ALTER TABLE `player` DROP COLUMN `merged_into_id`;
