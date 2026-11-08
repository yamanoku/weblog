import { desc, sql } from "void/db";
import { index, integer, primaryKey, sqliteTable, text } from "void/schema-d1";

// The only import_walk row uses this primary-key value.
export const importWalkProject = "yamanoku";

export const entries = sqliteTable(
  "entries",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    visibility: text("visibility").notNull(),
    bookmarkUrl: text("bookmark_url"),
    publishedAt: text("published_at"),
    cosensePageId: text("cosense_page_id").unique(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    viewPath: text("view_path").unique(),
    lastImportedBody: text("last_imported_body"),
    sourceUpdatedAt: integer("source_updated_at"),
    inReplyToId: text("in_reply_to_id"),
    threadRootId: text("thread_root_id"),
  },
  (table) => [
    index("entries_feed")
      .on(table.kind, table.publishedAt, table.id)
      .where(sql`visibility = 'public' AND published_at IS NOT NULL`),
    index("entries_titles")
      .on(table.updatedAt, table.id)
      .where(sql`visibility = 'public' AND title <> ''`),
    index("entries_thread").on(table.threadRootId, table.createdAt, table.id),
  ],
);

export const edges = sqliteTable(
  "edges",
  {
    sourceId: text("source_id").notNull(),
    writtenTitle: text("written_title").notNull(),
    targetId: text("target_id"),
  },
  (table) => [
    index("edges_source_id").on(table.sourceId),
    index("edges_written_title").on(table.writtenTitle),
  ],
);

export const pastTitles = sqliteTable(
  "past_titles",
  {
    entryId: text("entry_id").notNull(),
    title: text("title").notNull(),
    recordedAt: text("recorded_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.entryId, table.title] }),
    index("past_titles_title").on(table.title),
  ],
);

export const pathRedirects = sqliteTable("path_redirects", {
  pathKey: text("path_key").primaryKey(),
  entryId: text("entry_id").notNull(),
});

export const ownerToken = sqliteTable("owner_token", {
  hash: text("hash").notNull(),
  issuedAt: text("issued_at").notNull(),
});

export const deliveryRecords = sqliteTable("delivery_records", {
  entryId: text("entry_id").primaryKey(),
});

export const tombstones = sqliteTable("tombstones", {
  entryId: text("entry_id").notNull(),
  deletedAt: text("deleted_at").notNull(),
});

export const gyazoObjects = sqliteTable(
  "gyazo_objects",
  {
    imageId: text("image_id").notNull(),
    extension: text("extension").notNull(),
    objectKey: text("object_key").notNull(),
  },
  (table) => [primaryKey({ columns: [table.imageId, table.extension] })],
);

export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    entryId: text("entry_id"),
    objectId: text("object_id").notNull(),
    publishedAt: text("published_at").notNull(),
  },
  (table) => [index("activities_outbox").on(desc(table.publishedAt), desc(table.id))],
);

export const deliveryJobs = sqliteTable("delivery_jobs", {
  activityId: text("activity_id").primaryKey(),
});

export const deliveryTargets = sqliteTable(
  "delivery_targets",
  {
    activityId: text("activity_id").notNull(),
    actorId: text("actor_id").notNull(),
    inboxUrl: text("inbox_url"),
    sentAt: text("sent_at"),
  },
  (table) => [primaryKey({ columns: [table.activityId, table.actorId] })],
);

export const followers = sqliteTable("followers", {
  actorId: text("actor_id").primaryKey(),
  inboxUrl: text("inbox_url"),
  followActivityId: text("follow_activity_id"),
  createdAt: text("created_at").notNull(),
});

export const queueOpTally = sqliteTable("queue_op_tally", {
  utcDate: text("utc_date").primaryKey(),
  operations: integer("operations").notNull(),
});

export const kvWriteTally = sqliteTable("kv_write_tally", {
  utcDate: text("utc_date").primaryKey(),
  writes: integer("writes").notNull(),
});

export const importWalk = sqliteTable("import_walk", {
  project: text("project").primaryKey(),
  lastCompletedPageId: text("last_completed_page_id"),
  finished: integer("finished").notNull(),
});

export const importWriteTally = sqliteTable("import_write_tally", {
  utcDate: text("utc_date").primaryKey(),
  rowsWritten: integer("rows_written").notNull(),
});
