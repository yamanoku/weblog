-- void:allow-destructive
DROP INDEX `entries_feed`;
--> statement-breakpoint
CREATE INDEX `entries_feed` ON `entries` (`kind`,`updated_at`,`id`) WHERE visibility = 'public' AND published_at IS NOT NULL;
