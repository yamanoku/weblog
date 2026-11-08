# Database design

[日本語](database.ja.md)

## About this document

This design lists the tables in the one D1 database for [weblog.yamanoku.net](../../products/weblog/product.md). Entry rows stay in [owner writing](../../products/weblog/features/owner-writing/requirements.md). Public reads stay in [public reading](../../products/weblog/features/public-reading/requirements.md). Delivery rows stay in [ActivityPub](../../products/weblog/features/activitypub/requirements.md). Import columns stay in [Cosense import](../../products/weblog/features/cosense-import/requirements.md). [Relocation](../../products/weblog/features/relocation/requirements.md) adds no table.

### Audience

People and agents creating this database.

### Prerequisites

The product rule that the first store adapter is D1. The requirements linked above.

### Outside this document

- The query library. The store adapter uses `void/db`. This document does not choose another one.
- HTTP paths and feed documents.
- Visual design.
- The actor private key. It is a Worker secret, not a column.

## Implementation approach

There is one D1 database. This design adds no second database and no column beyond the lists below. The store adapter runs each commit as one `batch()`. A failed batch leaves that batch's changes uncommitted.

Timestamps that the entry features store are UTC ISO 8601 strings, except `source_updated_at`, which is Unix seconds. An entry id is a lowercase UUID chosen in the Worker before the batch.

## Architecture and sequence diagrams

No diagram. The sections below are the schema. A picture would repeat the same names.

## Data model and ER diagrams

`entries` is the parent of edges, past titles, and redirects. `delivery_records` and `tombstones` remain after the entry row is gone. Foreign-key delete cascades do not remove them. Edges and past titles are removed by explicit statements in the delete batch. No foreign key runs from `followers` or `entries` into activities or jobs. `gyazo_objects` has no foreign key to `entries`. The image id is parsed from body text.

### `entries`

Columns are `id`, `kind`, `title`, `body`, `visibility`, `bookmark_url`, `published_at`, `cosense_page_id`, `created_at`, `updated_at`, `view_path`, `last_imported_body`, `source_updated_at`, `in_reply_to_id`, and `thread_root_id`.

`id` is the primary key. `kind` is article, note, bookmark, or page. `visibility` is draft or public. `view_path` is unique, and many rows may be NULL. `cosense_page_id` is unique and may be NULL. The owner's HTTP API does not accept `cosense_page_id`. Owner update SQL does not write it.

`last_imported_body` and `source_updated_at` may be NULL. Only an import commit writes them. `source_updated_at` is an integer number of Unix seconds. It is not `updated_at`.

`in_reply_to_id` and `thread_root_id` may be NULL. Neither column has a foreign key. A note that does not reply to another note leaves both NULL. A reply stores the chosen note's id in `in_reply_to_id`. It stores that note's `thread_root_id` when the chosen note has one, and otherwise stores the chosen note's id. Deleting a note does not change these columns on another row.

### `edges`

Columns are `source_id`, `written_title`, and `target_id`. `target_id` may be NULL. Indexes are on `source_id` and `written_title`.

### `past_titles`

Columns are `entry_id`, `title`, and `recorded_at`. The primary key is `entry_id` plus `title`. `title` is indexed.

### `path_redirects`

`path_key` is the primary key. The row holds `entry_id`.

### `owner_token`

The table is always one row. Columns are `hash` and `issued_at` only. The stored value is the SHA-256 hash of the CLI token.

### `delivery_records`

`entry_id` is the primary key. ActivityPub inserts the row when a Create job is committed. Kind, visibility, and delete do not remove it. Owner writing does not insert it.

### `tombstones`

Columns are `entry_id` and `deleted_at`. The row has no body. It is inserted only when a delivered entry is deleted.

### `gyazo_objects`

Columns are `image_id`, `extension`, and `object_key`. `extension` is lowercase and has no dot. `object_key` includes the export directory name. The primary key is `image_id` plus `extension`. A public request does not write this table. An entry write batch does not include it.

Read indexes, and they do not replace the unique `view_path` or the edge and past-title indexes:

- `entries_feed` on `(kind, published_at, id)` where `visibility = 'public'` and `published_at` is not null
- `entries_titles` on `(updated_at, id)` where `visibility = 'public'` and `title <> ''`
- `entries_thread` on `(thread_root_id, created_at, id)`

### Delivery

- `activities` holds `id`, `type`, `entry_id`, `object_id`, and `published_at`. `id` is the activity URL and the primary key. `type` is `Create`, `Update`, `Delete`, or `Accept`. `entry_id` is null for Accept. The outbox index is `published_at` descending, then `id` descending.
- `delivery_jobs` holds `activity_id` as its primary key. A row means the send is not finished. Success deletes the row.
- `delivery_targets` holds `activity_id`, `actor_id`, `inbox_url`, and `sent_at`. The primary key is `activity_id` plus `actor_id`. `inbox_url` may be null until a fetch succeeds. `sent_at` is null until that target is sent or skipped. Success of the job deletes these rows.
- `followers` holds `actor_id` as its primary key, plus `inbox_url`, `follow_activity_id`, and `created_at`. `inbox_url` and `follow_activity_id` may be null. One sender is one row. Undo deletes that row and does not delete activities.
- `queue_op_tally` holds `utc_date` as its primary key, a `YYYY-MM-DD` UTC date, and an integer `operations`.
- `kv_write_tally` holds `utc_date` as its primary key and an integer `writes`.

### Import

`import_walk` holds one row. Its primary key is the constant `yamanoku`. `last_completed_page_id` is nullable text. `finished` is 0 or 1. A missing row is an unfinished walk with a null cursor.

`import_write_tally` has primary key `utc_date`, a `YYYY-MM-DD` UTC date, and an integer `rows_written`.

Deleting an entry removes that row's page id, snapshot, and source time. The walk row remains.

## APIs and interfaces

None added. The owner's list and get return rows that remain in `entries`. A tombstone is not an editable entry.

## External service integration

The database is the one D1 binding. This document adds no other database product.

## Data handling

The body stored in `entries` is plain text. HTML is not stored. `tombstones` does not copy the body. `delivery_records` and `tombstones` stay after the entry row is gone. `gyazo_objects` is loaded by an owner command from a local listing. A reader does not write it.

## Authentication and authorization notes

`owner_token` stores only the hash. The token value is returned once at issuance and is not written to logs or public responses.

## Security considerations

The actor private key is not selected by public SQL. Public HTML does not read the delivery tables, `owner_token`, or `cosense_page_id`.

## Deployment notes

The first database is empty except for the tables above. `gyazo_objects` may start empty. `followers` may start empty. There is no migration from an existing site inside this document. Relocation adds no table.

## Alternatives considered

### A second D1 database

Delivery and images would leave the entry batch. One commit could not keep the entry and its delivery job together. The store stays one D1 database.

### A foreign key from images to entries

The image id is text inside the body. A foreign key would invent a relationship the rows do not have. `gyazo_objects` stays separate.

### Cascading deletes into delivery rows

A deleted entry must still show 410 when it was delivered. Cascades would remove `delivery_records` and `tombstones`. Those rows are deleted only by the statements that name them.

## Open questions

None that block this schema.
