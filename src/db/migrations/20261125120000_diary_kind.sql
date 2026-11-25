-- Stored pages become diaries. A public row gains published_at when it has none.
-- This statement does not insert delivery_records and does not send an activity.
UPDATE `entries`
SET `kind` = 'diary',
    `published_at` = COALESCE(`published_at`, `created_at`)
WHERE `kind` = 'page' AND `visibility` = 'public';
--> statement-breakpoint
UPDATE `entries`
SET `kind` = 'diary'
WHERE `kind` = 'page';
--> statement-breakpoint
-- An article whose whole title is YYYY-MM-DD is a diary. Other titles stay articles.
UPDATE `entries`
SET `kind` = 'diary'
WHERE `kind` = 'article'
  AND length(`title`) = 10
  AND `title` GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]';
