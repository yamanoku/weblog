CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`entry_id` text,
	`object_id` text NOT NULL,
	`published_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activities_outbox` ON `activities` ("published_at" desc,"id" desc);--> statement-breakpoint
CREATE TABLE `delivery_jobs` (
	`activity_id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `delivery_records` (
	`entry_id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `delivery_targets` (
	`activity_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`inbox_url` text,
	`sent_at` text,
	PRIMARY KEY(`activity_id`, `actor_id`)
);
--> statement-breakpoint
CREATE TABLE `edges` (
	`source_id` text NOT NULL,
	`written_title` text NOT NULL,
	`target_id` text
);
--> statement-breakpoint
CREATE INDEX `edges_source_id` ON `edges` (`source_id`);--> statement-breakpoint
CREATE INDEX `edges_written_title` ON `edges` (`written_title`);--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`visibility` text NOT NULL,
	`bookmark_url` text,
	`published_at` text,
	`cosense_page_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`view_path` text,
	`last_imported_body` text,
	`source_updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entries_cosense_page_id_unique` ON `entries` (`cosense_page_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `entries_view_path_unique` ON `entries` (`view_path`);--> statement-breakpoint
CREATE INDEX `entries_feed` ON `entries` (`kind`,`published_at`,`id`) WHERE visibility = 'public' AND published_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX `entries_titles` ON `entries` (`updated_at`,`id`) WHERE visibility = 'public' AND title <> '';--> statement-breakpoint
CREATE TABLE `followers` (
	`actor_id` text PRIMARY KEY NOT NULL,
	`inbox_url` text,
	`follow_activity_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gyazo_objects` (
	`image_id` text NOT NULL,
	`extension` text NOT NULL,
	`object_key` text NOT NULL,
	PRIMARY KEY(`image_id`, `extension`)
);
--> statement-breakpoint
CREATE TABLE `import_walk` (
	`project` text PRIMARY KEY NOT NULL,
	`last_completed_page_id` text,
	`finished` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `import_write_tally` (
	`utc_date` text PRIMARY KEY NOT NULL,
	`rows_written` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kv_write_tally` (
	`utc_date` text PRIMARY KEY NOT NULL,
	`writes` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `owner_token` (
	`hash` text NOT NULL,
	`issued_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `past_titles` (
	`entry_id` text NOT NULL,
	`title` text NOT NULL,
	`recorded_at` text NOT NULL,
	PRIMARY KEY(`entry_id`, `title`)
);
--> statement-breakpoint
CREATE INDEX `past_titles_title` ON `past_titles` (`title`);--> statement-breakpoint
CREATE TABLE `path_redirects` (
	`path_key` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `queue_op_tally` (
	`utc_date` text PRIMARY KEY NOT NULL,
	`operations` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tombstones` (
	`entry_id` text NOT NULL,
	`deleted_at` text NOT NULL
);
