ALTER TABLE `entries` ADD `in_reply_to_id` text;--> statement-breakpoint
ALTER TABLE `entries` ADD `thread_root_id` text;--> statement-breakpoint
CREATE INDEX `entries_thread` ON `entries` (`thread_root_id`,`created_at`,`id`);
