# Public reading design

[日本語](design.ja.md)

## About this document

This design decides how one Worker serves [Public reading](requirements.md) on [weblog.yamanoku.net](../../product.md). An unauthenticated reader receives HTML, the human-readable feeds, empty pages, and Gyazo bytes. The stored body stays plain text.

Write validation, the view path, drafts, and tombstones stay in [Owner writing](../owner-writing/requirements.md). This document does not restate those rules.

### Audience

People and agents implementing or changing this feature.

### Prerequisites

The acceptance criteria in [Public reading](requirements.md). The view path, deliverable entries, edge extraction, and the 410 Tombstone in [Owner writing](../owner-writing/requirements.md).

On the Free plan, D1 allows 50 queries per Worker invocation. A `batch()` call counts as one query against that limit. Statement length and bound parameters still apply to each statement inside the batch. The source is [Limits](https://developers.cloudflare.com/d1/platform/limits/). One statement accepts at most 100 bound parameters. A query result is at most 50 MB. That result cap takes effect on 2026-11-04.

[R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) defines `get(key)`. It returns the object body, or null when the key is absent. `list()` exists on the same binding. This feature does not call it while serving a reader.

[JSON Feed 1.1](https://www.jsonfeed.org/version/1.1/) is the feed document for `GET /feed.json`. Publishers serve it as `application/feed+json`.

### Outside this document

- Owner create, update, delete, browser authentication, and the CLI token
- The ActivityPub actor, Follow, signatures, sending activities, and Activity Streams for a live entry
- WebFinger, the outbox, followers, and the inbox
- Bulk import from Cosense
- The order of rendering Cosense notation other than links
- The ORM
- The owner's write API and the owner's list of 50 entries

## Implementation approach

The deliverable is the public routes on the same Worker that handles owner writes. The first response for a public HTML page is server-rendered HTML. After that, a move to another public HTML page on this host runs in the browser and does not replace the whole document. The screen is Svelte. The domain does not import Svelte. Feeds and image bytes stay documents and bytes.

The domain reads public rows, resolves public titles, and renders HTML. Adapters read D1 and the R2 bucket. The domain does not import the Cloudflare SDK, D1 types, R2 types, an ORM, or Fedify types. Replacing the host means replacing those adapters. Rendering is the render port. The object port is the image-fetch port. The store port is the entry store for these reads.

Public routes do not read owner credentials, except GET `/`, GET `/{title}`, and GET `/e/{id}`. GET `/` reads the Access JWT only to include or omit the note field from owner writing. GET `/{title}` reads it only to include or omit the edit link on a public article, bookmark, or page, and to include or omit the `作成` link when no public entry has the title. GET `/e/{id}` reads it only to include or omit the reply fields on a public note, and to include or omit that edit link on a public article, bookmark, or page. The deliverable list is the same for every caller. A draft is absent from every response this feature returns. The owner reads a draft at GET `/entries/{id}` and GET `/edit/{id}`, which belong to owner writing.

The read flow is as follows.

1. The Worker matches a fixed route before a title path.
2. The domain reads only public rows. A store error becomes 503 `store_unavailable` and stops the response.
3. For an entry or a feed item, the domain renders the stored Markdown and the anchors come from that Markdown. Inbound edges used to decide an empty page are the edges stored when the body was written.
4. Title targets are resolved again from public rows. The stored `target_id` is not the public href, because that id can point at a draft.
5. The Worker returns one HTML document, one feed document, one empty page, or the image bytes.

A page that needs title resolution uses two `batch()` calls. The first reads the entry or the 11-row page. The second resolves titles and Gyazo ids, with `IN` lists chunked at 80 bound parameters. [Limits](https://developers.cloudflare.com/d1/platform/limits/) counts one `batch()` as one query toward the 50-query invocation limit. Statement length and the 100-parameter limit still apply inside the batch. An image request uses one SELECT and one R2 `get`. This feature does not issue one query per edge. This design does not claim that HTML rendering fits the free tier's CPU time per invocation. That time is unmeasured. A request that cannot finish inside the free tier fails for that request. The app does not move onto a paid plan.

`vp dev` answers the public HTML pages from the in-memory domain catalog. Those loaders do not query D1. `/` lists the catalog's deliverable entries. `/{title}` resolves a public catalog title. `/e/{id}` returns the catalog entry for that id. A catalog note is one note and has no reply link. A reply saved during `vp dev` is written to local D1 and does not appear on that page. An article saved from the edit screen during `vp dev` is written to local D1 and does not appear on those pages.

`vp preview` and the deployed Worker read those pages from D1 through the store adapter. They do not add catalog rows. An empty table stays an empty list. A draft row stays absent. Page files do not import `void/db`. The edit screens read D1 in both modes. The acceptance criteria describe the deployed Worker. The catalog is not a second store.

## Architecture and sequence diagrams

The reader talks only to the Worker. The Worker calls the domain. The domain calls a store port and, for a Gyazo image, an object port. The store port's first adapter is D1, binding `DB`. The Gyazo object port's adapter is R2, binding `GYAZO_BUCKET`, bucket `gyazo-archives`. A note image is read from the R2 binding `STORAGE` at the key `notes/{id}`. During `vp dev`, the public HTML loaders stop at the catalog and do not call D1. The diagram is the deployed read.

```mermaid
sequenceDiagram
  participant Reader
  participant Worker
  participant Domain
  participant D1
  Reader->>Worker: GET a public document
  Worker->>Domain: Read without credentials
  Domain->>D1: batch of public reads
  alt The store refuses
    Domain-->>Reader: 503 store_unavailable
  else A public entry or a page
    Domain->>D1: batch for titles and Gyazo ids
    Domain-->>Reader: 200 HTML, Atom, or JSON Feed
  else No public entry, with a public inbound edge
    Domain-->>Reader: 200 empty page
  else Missing or deleted
    Domain-->>Reader: 404 or 410
  end
```

```mermaid
sequenceDiagram
  participant Reader
  participant Worker
  participant Domain
  participant D1
  participant R2
  Reader->>Worker: GET /gyazo/{imageId}.{extension}
  Worker->>Domain: Read one object
  Domain->>D1: SELECT object_key
  alt No index row
    Domain-->>Reader: 404
  else A key
    Domain->>R2: get(object_key)
    alt get returns null
      Domain-->>Reader: 404
    else Bytes
      Domain-->>Reader: 200 bytes
    end
  end
```

A further diagram is omitted. Feed pages use the first sequence with a different SELECT. They do not add another runtime component.

## Data model and ER diagrams

This feature reads the entry tables owner writing already stores. It does not change their columns, and it does not insert entries or edges. The columns a public read uses are:

- `entries`: id, kind, title, body, visibility, bookmark_url, published_at, updated_at, view_path
- `edges`: source_id, written_title
- `past_titles`: entry_id, title, recorded_at
- `path_redirects`: path_key, entry_id
- `tombstones`: entry_id, deleted_at

`tombstones` is the signal that a deleted id was delivered. The row has no body. This feature does not read `delivery_records`, `owner_token`, or `cosense_page_id`.

Public hrefs are built from a fresh public lookup. `edges.target_id` stays in the table for the owner's write. It is not selected for public HTML.

Timestamps stay the UTC ISO 8601 strings owner writing stores. This feature compares those strings as text and copies the stored string into the next-page URL. It does not redefine the write format. Text order matches time order when every stored value uses one fixed-width UTC form.

This feature adds `gyazo_objects`. A public request does not write it. The entry write batch does not include it.

- `image_id` is the first path segment of a Gyazo URL.
- `extension` is lowercase and has no dot.
- `object_key` includes the export directory name.
- The primary key is `image_id` plus `extension`. One image id can have several extensions.

```mermaid
erDiagram
  gyazo_objects {
    TEXT image_id PK
    TEXT extension PK
    TEXT object_key
  }
```

There is no foreign key from `gyazo_objects` to `entries`. The image id is parsed from body text. An entry diagram would invent a relationship the tables do not have.

The feed query uses one read index:

- `entries_feed` on `(kind, updated_at, id)` where `visibility = 'public'` and `published_at` is not null

The table also has `entries_titles` on `(updated_at, id)` where `visibility = 'public'` and `title <> ''`. This feature does not read that index.

`view_path` is already unique. `edges.written_title` and `past_titles.title` are already indexed. This feature does not replace those indexes.

## APIs and interfaces

The host in every absolute URL this feature emits is `https://weblog.yamanoku.net`. The request Host header does not change it.

### Route order

The Worker matches these paths before a title. The comparison keys `feed.xml` and `feed.json` take no view path, together with the keys owner writing already reserves, so a title does not occupy a feed URL.

- `GET /`
- `GET /feed.xml`
- `GET /feed.json`
- `GET /feed/articles.xml`
- `GET /feed/notes.xml`
- `GET /feed/bookmarks.xml`
- `GET /gyazo/{imageId}.{extension}`
- `GET /note-images/{id}`
- `GET /e/{id}`
- The owner prefixes `edit`, `entries`, `tokens`, `users`, and `.well-known`

`GET /gyazo` with no image id is not the image route. It does not list the bucket. A title whose key is `gyazo` has no view path, so the request continues as a title path.

`GET /note-images/{id}` returns one stored image. The id is the image id. For a note, that id is the note's immutable id. The entry must be a public note, article, bookmark, or page. A missing image, an entry that is not public, and a draft are 404 and return no bytes. The content type is the stored type: `image/jpeg`, `image/png`, `image/gif`, or `image/webp`. The host does not list the bucket. The bytes are read from the R2 binding `STORAGE` at the key `notes/{id}`. They are not read from `gyazo-archives`. On a public note, the HTML shows that image under the body when the note has one. The image source is `/note-images/{id}`. The alt text is the alternative text stored with the note. On a public article or a public page, the HTML renders the body as Markdown, including a Markdown image, and does not list stored images under the body. On a public bookmark, the HTML renders the body as Markdown, including a Markdown image, and lists every stored image under the body. The alt text of a listed bookmark image is the stored text, and it may be empty. The stored body is not changed. An entry with no image has no such image.

A title URL is one path segment. The segment is percent-decoded to the comparison key. The comparison key is the one owner writing defines: the normalized title with each space replaced by `_`.

### Next page

`GET /` and the feeds do not share a query. The home list uses a page number. A feed uses `before` and `before_id`.

#### Home list

The first page of `GET /` has no query. `page=1` lists the same twelve entries. A later page sets `page` to the 1-based page number, so the second page is `/?page=2`. Each page holds twelve entries from the deliverable entries and the public pages together. The last page may be shorter. The offset is `(page - 1) * 12`. A public page with `source_updated_at` uses that Unix second. Every other row uses `updated_at` converted to Unix seconds. Newer seconds come first, and an equal second breaks the tie by `id` descending. The response counts those rows, then reads that page with `LIMIT` and `OFFSET`. The feeds do not use this list.

`page` is omitted, empty, or a decimal integer of at least 1 with no leading zero and no sign. Any other value is 400 `invalid_page`. The body is `text/plain; charset=utf-8` and `Cache-Control` is `no-store`. A 400 is not an empty list.

When no deliverable entry and no public page exist, page 1 is 200 and the list is empty. When only public pages exist, the list shows those pages. A page number greater than the number of pages is 404. Zero entries make one empty page, so `/?page=2` is 404.

When more than one page exists, the HTML includes a `nav` whose accessible name is `ページ`. One page omits that nav. `前へ` is present when a previous page exists, with `rel="prev"`. `次へ` is present when a next page exists, with `rel="next"`. The first page's href is `/`. A later page's href is `/?page=` plus the number. The current page is text with `aria-current="page"` and is not a link. When there are more than seven pages, the numbers are the first page, the last page, and the current page plus its neighbors. A skipped run is the text `…` and is not a link. The document head has `link rel="prev"` and `link rel="next"` for those same URLs.

An insert or a delete between requests can repeat or skip an item. The home list accepts that so a reader can open `/?page=2`.

#### Feeds

The first feed page has no query. A later page sets `before` and `before_id` on that same path.

The response reads 11 rows. It returns the first 10. When an 11th row exists, the next URL is absolute and uses the 10th row's stored sort value as `before` and that row's id as `before_id`. The last page omits the next URL. The predicate for a descending sort is `sort_column < ? OR (sort_column = ? AND id < ?)`. The pages partition that order. A cursor whose row was later deleted still continues from that position.

For a feed, `before` is the stored `updated_at`. Values are percent-encoded. This cursor is not the owner's list cursor. The owner list remains 50 rows and includes drafts.

Both parameters are required together. `before_id` is a lowercase UUID. `before` is a non-empty string of at most 40 characters and contains no whitespace. Any other combination is 400 `invalid_cursor`. The body is `text/plain; charset=utf-8` and `Cache-Control: no-store`. A 400 is not an empty list.

### Shared HTML

One function renders public HTML. An article, a bookmark, and a page render the stored body as Markdown: headings, paragraphs, nested lists, quotations, emphasis, strikethrough, inline code, fenced code, links, images, and a table with a caption. Raw HTML in that text is escaped, and the stored string is never inserted as HTML. A note keeps the stored lines, escaped. Links in a page are the Markdown links the import stored. Rendering does not walk Cosense brackets again, except a bracket that is only a Gyazo URL and one other `http` or `https` URL, and a bracket that is `/project` or `/project/page title`. That project bracket is the scrapbox.io link from the import rule. Icons, formulas, and lines that start with `$` or `%` stay the strings left in the body.

The href of a link in the body is the URL written in that Markdown. A label may contain brackets. The destination is the URL after the `]` that closes the opening `[`. A nested `[text](URL)` inside the label is that text, not a second anchor. A generated href is only `http`, `https`, or a path on this host. Any other scheme is escaped text. The public page stylesheet selects `a` elements whose href starts with `http://` or `https://`, ignoring case. It sets the underline style to dotted and the thickness to `2/16 rem`. The background is `--color-primitive-yellow-100`. While the anchor is focused, the background stays the component's `--color-primitive-yellow-300`. While it is pressed, the text is orange, so the background is that same yellow mixed lighter with white. That keeps the orange text at the 4.5:1 contrast it has on white. In forced-colors mode the browser replaces this background, and the dotted line remains. Rendering adds no class. The feed fragment stays the same HTML, so a feed reader does not show the dotted line. When the anchor contains an `img` or a `video`, the stylesheet removes the underline, because a dotted underline would cross the picture, and draws a `2/16 rem` dotted outline on that media. A thicker solid line was not used, because the existing link component already thickens the solid underline on hover. A YouTube or Spotify media link is not that anchor. The renderer builds an iframe `src` from the video id, the playlist id, or the Spotify type and id. It does not copy the written URL into the frame. A YouTube `src` is `https://www.youtube-nocookie.com/embed/{id}` or `.../embed/videoseries?list={id}`. A Spotify `src` is `https://open.spotify.com/embed/{type}/{id}`. A Speaker Deck deck is also not that anchor when its player address is known. The public URL `https://speakerdeck.com/{user}/{slug}` does not contain the player id. Before rendering, the page asks `https://speakerdeck.com/oembed.json` for each distinct deck URL in the body and in the bookmark URL, at most 20. The lookup follows redirects. It reads only an iframe src of `https://speakerdeck.com/player/` plus 32 hexadecimal characters. It does not insert the returned HTML. A `slide` query that is a positive integer of at most four digits is added to that src. A URL that is already that player address is embedded without asking. A profile URL, a failed answer, and a missing player stay anchors, and the page stays 200. A successful player address is reused for about 30 days. A note and the home list do not ask. The iframe title is the link text when that text is not a URL, and otherwise `Speaker Deck`. A YouTube, Spotify, or Speaker Deck frame beside the title uses `loading="eager"`. A frame in the body uses `loading="lazy"`. Inbound edges shown on an empty page are the stored edges. Rendering does not extract them from the body again.

The list below resolves the title of a stored edge when an empty page lists its sources. It does not rewrite a Markdown href already stored in an entry body.

Public resolution of a page-edge title:

- Exactly one public entry has that current title. That entry is the target.
- Otherwise, exactly one public past title has the latest `recorded_at` for that string. That entry is the target. The latest `recorded_at` is compared as text. A tie means there is no single target.
- Otherwise there is no single target.

The href is then:

- One public target with a view path: that absolute view path.
- One public target with no view path: the canonical URL.
- No public target: the title path, so an empty page can open.
- No single target: the title path. The renderer does not choose one canonical URL.

The title lookups are `WHERE title IN (...)`, in chunks of 80 bound parameters, inside the second batch. The Worker does not query once per edge.

A `i.gyazo.com` or `gyazo.com` URL is parsed before the anchor is chosen. The host is compared case-insensitively. The image id is the first path segment. An extension is a trailing `.` plus `[A-Za-z0-9]+`, compared case-insensitively and stored lowercase without the dot. Query and fragment are ignored for the match. `scrapbox.io/files` stays the original URL string.

When the written URL's extension is in the index, the HTML uses `https://weblog.yamanoku.net/gyazo/{imageId}.{extension}`. When the written URL has no extension and the index has one key, the HTML uses that key's extension. When the written URL has no extension and the index has more than one key, the HTML keeps the original URL. When the index has no key, the HTML keeps the original URL. A kept URL is an external link. The renderer does not pick an object and does not emit the host URL.

Media for a rewritten URL:

- `png`, `jpg`, `jpeg`, `gif`, `webp`: an `img`. The alt text is the original URL.
- `mp4`: a `video` with `controls`.
- Any other extension: an anchor to the host URL.

A bracket whose text is only a Gyazo URL and one other `http` or `https` URL uses that same choice. An `img` or a `video` is wrapped in a link to the other URL. The alt text is the original Gyazo URL. When the choice is not an image or a video, the bracket becomes two links in the written order. The Gyazo link is the host URL when one non-image extension is selected, and the original URL otherwise. The stored body remains the bracket.

The ids are loaded with `WHERE image_id IN (...)`, chunked at 80, in the same batch as title resolution.

On the view path and on the canonical HTML page, a bookmark's external URL is rendered beside the `h1`. A YouTube or Spotify media URL, or a Speaker Deck URL whose player is known, is the same embed as a body link. Any other `http` or `https` value is an external anchor whose text is the URL. Any other non-empty value is escaped text, because owner writing does not validate the scheme. The stored body is not rewritten. An article, a note, and a page do not render that anchor. The home list keeps the bookmark title linked to the external URL.

Document responses use `text/html; charset=utf-8` and `Cache-Control: no-cache`. The Content-Security-Policy value is:

```text
default-src 'none'; img-src 'self'; media-src 'self'; frame-src https://www.youtube-nocookie.com https://open.spotify.com https://speakerdeck.com; base-uri 'none'; form-action 'none'
```

When GET `/e/{id}` includes a reply field, that response sets `form-action` to this host's `/edit`. Other document responses keep `form-action 'none'`.

The document language is `ja`. The visible next-page anchor text is `次へ`. These responses do not vary on a cookie, except the owner response for GET `/`, for a note's GET `/e/{id}`, for a public article, bookmark, or page on GET `/{title}` and GET `/e/{id}` when that response includes the edit link, and for GET `/{title}` when no public entry has the title and the response includes the `作成` link.

Entry HTML has a canonical link, plus alternate links to `/feed.xml` and `/feed.json`. The `h1` is the current title. On a bookmark, the external URL sits beside that heading. An empty title omits the `h1`, and the document title is the canonical URL. A title page with no entry uses `weblog.yamanoku.net` as the document title. A note thread uses the requested note's title, and uses that note's canonical URL when the title is empty. Feed pages use the same head links.

A public note's GET `/e/{id}` lists the thread. The thread root is that note's `thread_root_id` when the column is set, and otherwise that note's id. The rows are the public note whose id is the root, plus public notes whose `thread_root_id` is the root. Order is `created_at` ascending, then `id` ascending. Each body is shown in that order. A reply whose `in_reply_to_id` is still in the thread has a same-page link to that note. A reply whose target is absent has no target link. An article, a bookmark, and a page load one entry and do not run the thread query.

### Feeds

A feed row is `visibility = 'public'`, `published_at` is not null, `in_reply_to_id` is null, and `kind` is `article`, `note`, or `bookmark`. Order is `updated_at` descending, then `id` descending. Text comparison of the lowercase UUID is the tie-break. A public page is excluded. A kind feed adds `kind = ?`. There is no per-kind JSON Feed.

`GET /` is the HTML timeline. Each item has a heading link, the card body, and the bookmark line when the kind is bookmark. The card body is the entry body cut to 100 characters. The count is Unicode code points after consecutive whitespace becomes one space. For an article, a bookmark, or a page, the count uses the words the Markdown render would show, without the marks or the link URL. A note counts the stored text. When the text is longer, the card shows the 100 characters and then `…`. The stored body is unchanged. The entry page and the feeds still render the full body. For a bookmark whose external URL starts with `http://` or `https://`, the heading link is that URL. For every other item, the heading link uses the view path when one exists, and otherwise the canonical URL. The items on that page are cards in one wrapping grid. The column count follows the width of the list. The list does not divide them by date. Order stays `updated_at` descending, then `id` descending. Feeds are not divided by date.

`GET /feed.xml` and the three kind feeds are Atom. The media type is `application/atom+xml; charset=utf-8`. The feed `id` is the absolute URL of that feed without a query. The feed title is `weblog.yamanoku.net` for `/feed.xml`, and `記事`, `ノート`, or `ブックマーク` for the kind feeds. `link rel="self"` is the absolute URL of this page, including the query when one is present. `link rel="alternate"` points at `GET /`. `link rel="next"` is present only when a next page exists. Each entry `id` is the canonical URL. For a bookmark whose external URL starts with `http://` or `https://`, the entry `link rel="alternate"` is that URL. For every other entry, it is the view path or the canonical URL. `published` is the stored `published_at`. `updated` is the stored `updated_at`. The feed order is `updated_at` descending, then `id` descending. The entry `title` is the stored title. When the title is empty, the Atom title is the canonical URL. `content type="html"` is the same body fragment as the entry page. For a bookmark, that content also includes the external URL. The entry page shows that URL beside the title. An empty feed is 200 and has no entry elements. Its feed `updated` is `1970-01-01T00:00:00Z`.

`GET /feed.json` is JSON Feed 1.1. `version` is `https://jsonfeed.org/version/1.1`. `title` is `weblog.yamanoku.net`. `home_page_url` is `https://weblog.yamanoku.net/`. `feed_url` is the absolute URL of this page. `items` is required and may be empty. `items[].id` is the canonical URL. For a bookmark whose external URL starts with `http://` or `https://`, `items[].url` is that URL. For every other item, `items[].url` is the view path or the canonical URL. `items[].content_html` is the same fragment as Atom content. `items[].date_published` is the stored `published_at`. `items[].date_modified` is the stored `updated_at`. `items[].title` is omitted when the stored title is empty. A bookmark whose external URL is `http` or `https` sets `items[].external_url` to that URL. `next_url` is present only when a next page exists, and it differs from `feed_url`. An empty feed is 200 with `"items": []`.

### Path `/pages`

There is no title index and no `src/pages/pages.svelte`. The comparison key `pages` is not reserved. `GET /pages` follows the title path below. The response does not list articles.

### Title path

After the fixed routes, the Worker decides `GET /{comparison key}` in this order.

1. A public `view_path` match is 200 HTML for that entry.
2. A `path_redirects` row whose entry is public is 301. The absolute `Location` is the current view path when one exists, and otherwise the canonical URL. `Cache-Control` is `no-cache`. A destination that is draft or missing is ignored. The response does not redirect.
3. When no public `view_path` matched, and at least one public entry has this comparison key, the response is 404. Those entries remain at their canonical URLs. This is the collision and reserved-key case. The response does not choose one entry.
4. When no public entry has the key, and at least one public edge has a `written_title` whose comparison key equals it, the response is 200. The page shows the decoded comparison key as the `h1`. It lists each public source once, ordered by `updated_at` descending and then `id` descending. The anchor text is the source's current title. The href is that source's view path, or its canonical URL when it has no view path. The page has no next-page URL. The query has no `LIMIT`. A result over the 50 MB cap fails, and the response is 503.
5. Otherwise the response is 404.

A draft with the same title does not change this order. Reading does not insert an entry. The empty-page query matches `replace(written_title, ' ', '_')` to the comparison key, which is valid because stored edge titles are already normalized.

The 404 and 410 HTML documents contain the sentence `見つかりません` or `削除しました` and no entry body. They do not contain the word draft. `Cache-Control` is `no-cache`.

### Canonical URL

`GET /e/{id}` reads the public row and returns the same entry HTML as the view path.

When no public row exists and `tombstones` has the id, the response is 410. When `Accept` contains `application/activity+json` or `application/ld+json`, and it contains neither `text/html` nor `*/*`, the body is an Activity Streams Tombstone. Its `id` is the canonical URL, its `type` is `Tombstone`, and `deleted` is the stored `deleted_at`. The content type is `application/activity+json; charset=utf-8`. The deleted body is absent. Any other Accept is 410 HTML and also omits the deleted body.

When no public row exists and no tombstone exists, the response is 404. A draft id takes this branch.

When the row is public and `Accept` contains `application/activity+json` or `application/ld+json`, and it contains neither `text/html` nor `*/*`, the response is the Activity Streams object for that entry. The content type is `application/activity+json; charset=utf-8`. `Cache-Control` is `no-cache`. The object rules belong to ActivityPub. A browser Accept that includes `text/html` receives HTML. An Accept that includes `*/*` also receives HTML.

### Image bytes

`GET /gyazo/{imageId}.{extension}` selects `object_key` where `image_id` and the lowercased extension match. The adapter then calls `get(object_key)` on `GYAZO_BUCKET`. It does not call `list()`.

No index row, or a null `get`, is 404 with an empty body and `Cache-Control: no-store`. The content type is `text/plain; charset=utf-8`.

A body uses the object's `httpMetadata.contentType` when that value is present. Otherwise the extension map is `png` to `image/png`, `jpg` and `jpeg` to `image/jpeg`, `gif` to `image/gif`, `webp` to `image/webp`, `mp4` to `video/mp4`, and every other extension to `application/octet-stream`. The Worker does not sniff the bytes. A 200 uses `Cache-Control: public, max-age=86400`. This feature does not replace archive bytes. The one-day cache keeps a repeat view from counting again toward the daily Worker request allowance. An image 404 is not cached, so a later index load becomes visible.

Each image response counts as one Worker request.

### Store failure

D1 errors, including a free-allowance refusal and a result that exceeds the cap, become 503 `store_unavailable`. An R2 `get` that throws does too. The body is `text/plain; charset=utf-8` and `Cache-Control: no-store`. The response is not 404, 410, or 301. It does not ask the reader to buy a plan. Stored rows remain. Work waits until 00:00 UTC or fails for that request.

## External service integration

D1 is the store adapter, binding `DB`. The adapter queries through `db` from `void/db`. [D1](https://void.cloud/guide/database/d1) says those queries use a D1 session for each Void request, and that replicas can lag between requests. The domain does not know `D1Database` and does not import `void/db`. The source for the query budget and the 50 MB cap is [Limits](https://developers.cloudflare.com/d1/platform/limits/). The source for daily free-tier refusal, leaving stored rows in place, is the [D1 changelog of 2026-09-01](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/).

R2 is the object adapter for the existing archive, binding `GYAZO_BUCKET`, bucket `gyazo-archives`. The domain receives bytes and a content type from the port. It does not know `R2Bucket`. `get` is defined in the [Workers API reference](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/). This feature does not upload and does not list the bucket. Storage beyond 10 GB a month for the existing archive stays outside the zero-yen target. A note image is a second read, from the R2 binding `STORAGE` at the key `notes/{id}`. This feature does not upload that object and does not list that bucket. The content type of `GET /note-images/{id}` is the type stored with the note.

The public routes are not behind Cloudflare Access. Access remains on `/login`. An unverified `/edit` or `/new` is 404 from the Worker.

## Data handling

The public response is derived from stored plain text, public edges, past titles, redirects, tombstones, and `gyazo_objects`. Rendering is not written back to the entry. A read does not create an entry or an edge.

The Gyazo index is loaded by an owner command, not by a reader. The command reads a local listing of `{directory}/{imageId}.{extension}` and inserts or replaces `gyazo_objects` rows. It does not call R2 `list` or R2 `put`. A second run can continue a partial load because a missing id keeps the original URL in HTML. The command does not delete index rows that are absent from the listing. Removing a public image URL requires deleting that index row. This feature does not delete archive bytes.

The listing counted on 2026-11-01 had 15686 image files. That row count fits the free daily row-write allowance. The command uses `batch()` calls small enough to finish, and it can be run again.

Public bodies, titles, and bookmark URLs may name a person. They are world-readable because the owner set visibility to public. Drafts are not read here. This feature collects no account data. Image bytes at the public image URL are world-readable. There is no extra consent step.

## Authentication and authorization notes

None of these routes check a credential to choose a draft or a different entry list. GET `/` reads `Cf-Access-Jwt-Assertion`, or the `CF_Authorization` cookie when that header is absent, only to include or omit the note field. GET `/{title}` reads the same values only to include or omit the edit link on a public article, bookmark, or page, and to include or omit the `作成` link when no public entry has the title. GET `/e/{id}` reads the same values only to include or omit the reply fields on a public note, and to include or omit that edit link on a public article, bookmark, or page. A missing or invalid JWT stays 200 and omits the field and the link. The owner response that includes the field, a reply field, or the edit link uses `Cache-Control: private, no-store`. Other routes do not read `Cf-Access-Jwt-Assertion` or `Authorization`. Drafts stay on the owner routes from owner writing.

## Security considerations

Public HTML escapes stored text before it inserts a generated anchor whose URL is `http`, `https`, or a path on this host. The content security policy refuses scripts and refuses images from other hosts. A rewritten image is loaded from this host. An original Gyazo URL that this feature keeps is an anchor, so the policy does not fetch it as an image.

Responses on these routes do not include a draft body. GET `/` for a verified owner also sends `Cache-Control: private, no-store` and `Vary: Cookie`, so a shared cache does not store the note field. A verified owner's GET `/e/{id}` for a public note sends the same two headers, so a shared cache does not store the reply fields. A verified owner's GET `/{title}` or GET `/e/{id}` for a public article, bookmark, or page sends the same two headers when the edit link is included, so a shared cache does not store that link. A verified owner's GET `/{title}` with no public entry sends the same two headers when the `作成` link is included, so a shared cache does not store that link. Other responses do not vary on a cookie. A deleted body is not selected. The image route returns one object's bytes. A path that is not the image route does not return archive bytes and does not list the bucket.

## Deployment notes

The migration for this feature creates `gyazo_objects` and the two read indexes. An empty index is valid. Until rows exist, entry HTML keeps original Gyazo URLs, and image GET returns 404.

The index load is an owner command run from the local export listing. It is not a public route and it is not part of an entry write. The first database can start with an empty `gyazo_objects` table.

## Alternatives considered

### A keyset on the home list

`before` and `before_id` keep a partition when a row is inserted or deleted between requests. The home list uses `page` instead, because a reader opens the next twelve entries at `/?page=2`. Feeds keep the keyset.

### An opaque cursor

An opaque token can hide the sort keys. It needs a second encoding and still has to carry `published_at` or `updated_at` plus the id. The explicit query uses the stored strings directly.

### Listing the R2 bucket while rendering

A list would find keys without an index. The public request would page through the bucket, and more than one key would still have to be chosen. The D1 index answers the id in one SELECT, and the public request calls `get` for one key.

### Putting the Gyazo index in the entry write batch

The index would then commit with an unrelated entry. A reader request would still need the rows before any entry HTML can rewrite URLs. The load stays a separate owner command.

### HTML for an Activity Streams-only request

Returning the entry HTML would present a document that is not the Activity Streams object. The activity-only Accept receives that object. A request that also accepts `text/html` still receives HTML. A deleted id uses the same split. An activity-only Accept receives a Tombstone. An Accept that contains `text/html` or `*/*` receives 410 HTML.

### Returning a draft on the public path when a cookie is present

The owner could open a draft at its view path. A cache that varies on the cookie can also store that response under the public URL. Public routes ignore credentials, and the owner reads drafts at `/entries/{id}` and `/edit/{id}`.

## Open questions

None that block implementation.

Markdown for an article, a bookmark, and a page is rendered by one function, as the body HTML requirement says. Icons, formulas, and lines that start with `$` or `%` that remain in the body stay with the requirements of that rendering. Until those requirements exist, this feature shows that source text. The CPU time of this HTML render is unmeasured. That measurement does not change the routes above.
