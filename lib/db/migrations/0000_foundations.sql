CREATE TABLE `draft` (
	`id` text PRIMARY KEY NOT NULL,
	`state_json` text NOT NULL,
	`saved_game_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`saved_game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `draft_updated_idx` ON `draft` (`updated_at`);--> statement-breakpoint
CREATE TABLE `game` (
	`id` text PRIMARY KEY NOT NULL,
	`played_on` text NOT NULL,
	`location_id` text,
	`roster_id` text NOT NULL,
	`note` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `location`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`roster_id`) REFERENCES `roster`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `game_played_on_idx` ON `game` (`played_on`);--> statement-breakpoint
CREATE INDEX `game_roster_idx` ON `game` (`roster_id`);--> statement-breakpoint
CREATE INDEX `game_location_idx` ON `game` (`location_id`);--> statement-breakpoint
CREATE TABLE `game_player` (
	`game_id` text NOT NULL,
	`player_id` text NOT NULL,
	`column_order` integer NOT NULL,
	`sheet_name` text,
	`final_score` integer NOT NULL,
	PRIMARY KEY(`game_id`, `player_id`),
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `game_player_player_idx` ON `game_player` (`player_id`);--> statement-breakpoint
CREATE INDEX `game_player_final_score_idx` ON `game_player` (`final_score`);--> statement-breakpoint
CREATE TABLE `location` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`name_key` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `location_name_key_unique` ON `location` (`name_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `location_slug_unique` ON `location` (`slug`);--> statement-breakpoint
CREATE TABLE `login_attempt` (
	`ip_hash` text NOT NULL,
	`scope` text NOT NULL,
	`minute_bucket` integer NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`ip_hash`, `scope`, `minute_bucket`)
);
--> statement-breakpoint
CREATE INDEX `login_attempt_bucket_idx` ON `login_attempt` (`minute_bucket`);--> statement-breakpoint
CREATE TABLE `photo` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`draft_id` text,
	`game_id` text,
	`player_id` text,
	`draft_column_id` text,
	`s3_key_original` text NOT NULL,
	`s3_key_model` text NOT NULL,
	`width` integer,
	`height` integer,
	`bytes` integer,
	`rotation_applied` integer DEFAULT 0 NOT NULL,
	`sequence` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `photo_game_idx` ON `photo` (`game_id`);--> statement-breakpoint
CREATE INDEX `photo_draft_idx` ON `photo` (`draft_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `photo_one_sheet_per_game` ON `photo` (`game_id`) WHERE "photo"."kind" = 'sheet' AND "photo"."game_id" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `player` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`slug` text NOT NULL,
	`merged_into_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_slug_unique` ON `player` (`slug`);--> statement-breakpoint
CREATE TABLE `roster` (
	`id` text PRIMARY KEY NOT NULL,
	`signature` text NOT NULL,
	`size` integer NOT NULL,
	`name` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roster_signature_unique` ON `roster` (`signature`);--> statement-breakpoint
CREATE INDEX `roster_size_idx` ON `roster` (`size`);--> statement-breakpoint
CREATE TABLE `roster_member` (
	`roster_id` text NOT NULL,
	`player_id` text NOT NULL,
	PRIMARY KEY(`roster_id`, `player_id`),
	FOREIGN KEY (`roster_id`) REFERENCES `roster`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `roster_member_player_idx` ON `roster_member` (`player_id`);--> statement-breakpoint
CREATE TABLE `round_score` (
	`game_id` text NOT NULL,
	`player_id` text NOT NULL,
	`hand` integer NOT NULL,
	`running_total` integer NOT NULL,
	`score` integer NOT NULL,
	PRIMARY KEY(`game_id`, `player_id`, `hand`),
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `round_score_hand_idx` ON `round_score` (`hand`);--> statement-breakpoint
CREATE INDEX `round_score_player_idx` ON `round_score` (`player_id`);--> statement-breakpoint
CREATE TABLE `transcription` (
	`id` text PRIMARY KEY NOT NULL,
	`photo_id` text NOT NULL,
	`kind` text NOT NULL,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`raw_json` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`latency_ms` integer,
	`error` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`photo_id`) REFERENCES `photo`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transcription_photo_idx` ON `transcription` (`photo_id`);--> statement-breakpoint
CREATE INDEX `transcription_created_idx` ON `transcription` (`created_at`);--> statement-breakpoint
CREATE TABLE `usage_day` (
	`day` text PRIMARY KEY NOT NULL,
	`sheet_transcriptions` integer DEFAULT 0 NOT NULL,
	`column_transcriptions` integer DEFAULT 0 NOT NULL
);
