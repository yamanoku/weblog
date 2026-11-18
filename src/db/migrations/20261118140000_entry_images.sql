-- void:allow-destructive
CREATE TABLE `note_images_next` (
  `id` text PRIMARY KEY NOT NULL,
  `entry_id` text NOT NULL,
  `position` integer NOT NULL,
  `media_type` text NOT NULL,
  `byte_length` integer NOT NULL,
  `alt_text` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `note_images_next` (`id`, `entry_id`, `position`, `media_type`, `byte_length`, `alt_text`)
SELECT `entry_id`, `entry_id`, 0, `media_type`, `byte_length`, `alt_text` FROM `note_images`;
--> statement-breakpoint
DROP TABLE `note_images`;
--> statement-breakpoint
ALTER TABLE `note_images_next` RENAME TO `note_images`;
--> statement-breakpoint
CREATE INDEX `note_images_entry` ON `note_images` (`entry_id`, `position`);
