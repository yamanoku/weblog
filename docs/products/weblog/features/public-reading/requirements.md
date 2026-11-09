# Public reading

[日本語](requirements.ja.md)

## About this document

An unauthenticated reader reads public entries, human-readable feeds, the title index, empty pages, and Gyazo images without logging in. The canonical body stays plain text. HTML for display is produced from that text.

The parent product is [weblog.yamanoku.net](../../product.md). Write rules are in [Owner writing](../owner-writing/requirements.md).

### Scope

- Unauthenticated HTML for `GET /`, `GET /{title}`, and `GET /e/{id}`
- Human-readable feeds and the title index
- Empty pages for titles that have public inbound edges and no public entry
- The public Gyazo image URL and the bytes it returns
- Links in public HTML
- After the first HTML response, a link to another public HTML page on this host updates the page in the browser and does not replace the whole document

### Out of scope

- Owner create, update, delete, browser authentication, and the CLI token
- The ActivityPub actor, Follow, signatures, sending activities, and Activity Streams for a live entry
- WebFinger, the outbox, followers, and the inbox
- Bulk import from Cosense
- The order of rendering Cosense notation other than links. This feature shows that notation as source text
- The ORM
- The owner's write API and the owner's list of 50 entries

## User stories

### Move between public HTML pages

As an unauthenticated reader, I want the next public HTML page on this host to open in the browser so that the whole document is not replaced.

**Acceptance criteria:**

Scenario: When the reader follows a link to another public HTML page on this host

- Given: The reader has the first HTML for a public page.
- When: The reader follows a link to another public HTML page on this host.
- Then: The browser updates that page and does not replace the whole document. A direct request for either URL still returns 200 HTML. Feeds and image bytes are not this navigation.

### Read a public entry

As an unauthenticated reader, I want to open a public entry without logging in so that articles, short posts, bookmarks, and pages on this host can be read.

**Acceptance criteria:**

Scenario: When a public entry has a view path, that path returns the entry

- Given: A public entry has a view path and a body.
- When: An unauthenticated client requests that view path.
- Then: The response is 200 HTML. It includes the body. Page edges in the body are links. The line text remains. The response does not require login.

Scenario: When the reader opens the canonical URL, the same public entry is returned

- Given: A public entry has the canonical URL `https://weblog.yamanoku.net/e/{id}`.
- When: An unauthenticated client requests that URL and does not ask for Activity Streams.
- Then: The response is 200 HTML for that entry. The canonical URL stays the one issued at creation.

### Read the notes connected to a note

As an unauthenticated reader, I want the canonical page of a note to list that note and the owner's replies together, oldest first, so that I can read the connected posts in one place.

**Acceptance criteria:**

Scenario: When a note has no reply, the canonical page shows that note

- Given: A public note does not reply to another note. No public note replies in its thread. One public article exists.
- When: An unauthenticated client requests the note's canonical URL and does not ask for Activity Streams.
- Then: The response is 200 HTML and includes that note's body. It does not include the article's body. It does not include a reply field.

Scenario: When any note in a thread is opened, the same posts appear oldest first

- Given: Public note A does not reply to another note. Public note B replies to A. Public note C replies to B. One public article exists.
- When: An unauthenticated client requests the canonical URL of A, of B, and of C, and does not ask for Activity Streams.
- Then: Each response is 200 HTML. Each includes the bodies of A, B, and C. The order is created time ascending, then the immutable id ascending. B shows that it replies to A. C shows that it replies to B. A shows no reply target. The article body is absent. B and C are absent from GET `/` and from the note feed.

Scenario: When one note in the thread was deleted, the remaining notes stay together

- Given: Public note A does not reply to another note. Public note B replies to A. Public note C replies to B. B was deleted and has no delivered record.
- When: An unauthenticated client requests the canonical URL of C and does not ask for Activity Streams.
- Then: The response is 200 HTML. It includes the bodies of A and C. It does not include B's body. C shows no reply target. The canonical URL of B is 404.

Scenario: When the first note was deleted, a remaining reply stays on its canonical page

- Given: Public note A does not reply to another note. Public note B replies to A. A was deleted and has no delivered record.
- When: An unauthenticated client requests the canonical URL of B and does not ask for Activity Streams.
- Then: The response is 200 HTML and includes B's body. It does not include A's body. B shows no reply target. The canonical URL of A is 404.

Scenario: When the entry is not a note, the page does not list a note thread

- Given: A public article exists. A public note replies to another public note.
- When: An unauthenticated client requests the article's canonical URL and does not ask for Activity Streams.
- Then: The response is 200 HTML for that article. It does not include the note bodies.

Scenario: When the entry is a draft, the response matches a missing entry

- Given: An entry is draft. It may have a view path.
- When: An unauthenticated client requests its canonical URL or its view path.
- Then: The response matches a missing entry. It does not include the draft body. It does not say that the entry is a draft.

Scenario: When a delivered entry was deleted, the HTML does not include the deleted body

- Given: The entry was delivered and then deleted. Owner writing defines the 410 response.
- When: An unauthenticated client requests the canonical URL and does not ask for Activity Streams.
- Then: The response is 410. It does not include the deleted body.

Scenario: When a bookmark is public, the HTML includes its external URL

- Given: A public bookmark has an external URL. The body may also mention other URLs.
- When: An unauthenticated client requests that entry.
- Then: The HTML includes the external URL as an external link. The stored body is unchanged.

Scenario: When a public bookmark is listed, its title opens the external URL

- Given: A public bookmark has an external URL that starts with `http://` or `https://`. It also has a view path.
- When: An unauthenticated client opens GET `/`.
- Then: The title's link is that external URL. It is not the view path and not the canonical URL. A direct request for the canonical URL still returns that entry's HTML.

### Read the human-readable feeds

As an unauthenticated reader, I want to read a feed of deliverable entries so that I can follow new articles, short posts, and bookmarks without taking the title index as the feed.

**Acceptance criteria:**

Scenario: When deliverable entries exist, the first page lists ten of them

- Given: More than ten deliverable entries exist. A page is public and is not deliverable.
- When: An unauthenticated client requests `GET /`, `GET /feed.xml`, or `GET /feed.json`.
- Then: The response lists ten deliverable entries. Order is `publishedAt` descending, then the immutable id descending. The public page is absent. Each item includes the body. The item id is the canonical URL.

Scenario: When more than ten deliverable entries exist, the response offers the next page

- Given: Eleven deliverable entries exist.
- When: An unauthenticated client requests the first feed page.
- Then: The response includes the URL of the next page. That page contains the remaining entry and no URL for a further page.

Scenario: When no deliverable entry exists, the feed is an empty success

- Given: No deliverable entry exists. A public page may exist.
- When: An unauthenticated client requests `GET /`.
- Then: The response is 200. The list is empty. The response is not 404.

Scenario: When the reader asks for one kind, the Atom feed contains only that kind

- Given: Deliverable articles, notes, and bookmarks exist.
- When: An unauthenticated client requests `GET /feed/articles.xml`, `GET /feed/notes.xml`, or `GET /feed/bookmarks.xml`.
- Then: Each feed contains only that kind, with the same page size and order as `GET /feed.xml`.

### Walk titles

As an unauthenticated reader, I want to walk titles and open a title that has no entry yet so that public pages form a link graph and the title index stays separate from the feed.

**Acceptance criteria:**

Scenario: When public articles exist, the index lists ten titles

- Given: More than ten public articles have a title. A public page, a public note, and a public bookmark exist. One public article has an empty title.
- When: An unauthenticated client requests `GET /pages`.
- Then: The response lists ten titles and no bodies. Order is updated time descending, then the immutable id descending. Each listed entry is an article. The public page, the note, and the bookmark are omitted. The empty-title article is omitted. The response includes the URL of the next page. Each item also has a permalink to `/e/{id}` whose visible text is `パーマリンク`.

Scenario: When a title has no public entry and has a public inbound edge, the host returns an empty page

- Given: No public entry has the title. A public entry has an inbound edge to that title. A draft with that title may exist.
- When: An unauthenticated client requests that title path.
- Then: The response is 200. It includes the title and the current titles of the public sources. It does not include a draft body. It does not create an entry.

Scenario: When a title has no public entry and no public inbound edge, the response is 404

- Given: No public entry has the title. No public inbound edge points at the title.
- When: An unauthenticated client requests that title path.
- Then: The response is 404. It does not include a draft body. It does not create an entry.

### Read a Gyazo image

As an unauthenticated reader, I want public HTML to refer to this host for a Gyazo image so that the bytes can be read from the existing archive without changing the stored body.

**Acceptance criteria:**

Scenario: When the index has the image id and extension, the host returns the bytes

- Given: The index has one object key for that image id and extension. The bucket already stores the object.
- When: An unauthenticated client requests `GET /gyazo/{imageId}.{extension}`.
- Then: The response is the object's bytes. The host does not list the bucket. The stored entry body stays the original Gyazo URL. This response counts as one Worker request.

Scenario: When the index has no such object, the response is 404

- Given: The index has no object key for that image id and extension.
- When: An unauthenticated client requests that image URL.
- Then: The response is 404. It includes no image bytes. The host does not list the bucket.

Scenario: When the written URL identifies one object, public HTML refers to this host

- Given: A public body contains a `i.gyazo.com` or `gyazo.com` URL. The index can select one extension for that image id.
- When: An unauthenticated client requests the entry HTML.
- Then: The HTML refers to `https://weblog.yamanoku.net/gyazo/{imageId}.{extension}`. The stored body still contains the original URL.

Scenario: When the written URL does not identify one object, the HTML keeps the original URL

- Given: A public body contains a Gyazo URL with no extension. The index has more than one object key for that image id.
- When: An unauthenticated client requests the entry HTML.
- Then: The HTML keeps that original URL. It does not choose one of the objects.

## KPIs

### No numeric target

The parent product sets no percentage target for availability or delivery success. This feature is accepted or rejected by the acceptance criteria above.

- **Current value:** None, because the feature is new
- **Target value:** None
- **Measurement method:** None
- **Measurement period:** None

## Functional requirements

### Show a public entry

**Overview:** An unauthenticated client reads one public entry as HTML. Login is not required.

**Input:** `GET /{title}` or `GET /e/{id}` without an Activity Streams Accept type.

**Output:** HTML for a public entry, an empty page, a redirect, 404, or 410.

#### Applicable conditions

##### Which entry is public

A public entry has visibility public. Draft bodies stay out of these responses. A draft is indistinguishable from a missing entry for an unauthenticated client. Reading does not create an entry.

The kinds are article, note, bookmark, and page. A public page is readable at its URL. Deliverable entries, feeds, and `publishedAt` are defined by [Owner writing](../owner-writing/requirements.md). This feature does not send activities.

The canonical URL is `https://weblog.yamanoku.net/e/{id}`. A title change does not change it. Activity Streams for a live entry belong to the ActivityPub feature. This feature returns HTML when the request does not ask for Activity Streams.

A deleted id follows owner writing. A delivered deleted id is 410 and the HTML includes no deleted body. An undelivered deleted id is 404. Neither response includes the deleted body.

##### View path and redirects

The view path is `/{title}` after the title rules in owner writing. Spaces become `_` before percent-encoding. An empty-title note has no view path and is public only at its canonical URL. It is not a title-resolution target.

Titles that share a path after spaces become `_` get no view path. Both stay public only at their canonical URLs. A title whose comparison key is `gyazo` gets no view path.

An old path of a public entry redirects with 301 to the current view path. When the entry has no view path, the redirect target is the canonical URL. An unauthenticated client is not redirected to a draft. That request is handled as a missing title.

##### HTML of the body

The stored body stays plain text. Public HTML does not replace that string.

Public HTML for an article renders the stored body as Markdown. It turns paragraphs separated by blank lines, headings of one to six `#` followed by a space, unordered lists that start with `-` or `*`, `*` and `**` emphasis, inline code in backticks, fenced code, and `[label](URL)` links into HTML. A link URL is only `http`, `https`, or a path on this host. Raw HTML in the body is escaped and is not executed.

Public HTML for any other kind keeps the stored lines. Page edges become links to the target's view path. When the public target has no view path, the link uses the canonical URL. A link to a title with no public entry remains, so the empty page can be opened. External URLs become external links.

A bookmark's external URL is shown as an external link. The host does not insert that URL into the stored body.

Icons, tables, formulas, and Cosense decoration stay source text. The order of HTML for those is decided when that rendering's requirements are written.

A `i.gyazo.com` or `gyazo.com` URL uses the image rule below. A `scrapbox.io/files` URL stays the original URL string. This feature does not copy that file.

##### Note thread

The canonical page of a public note lists every public note in its thread. The order is created time ascending, then the immutable id ascending. The first note shows no reply target. A later note shows the note it replies to when that note is still in the thread. When the target is absent, the later note stays in the thread and shows no reply target. Opening any remaining note in the thread returns that same list. A deleted id follows owner writing and does not return the deleted body. An article, a bookmark, and a page stay one entry. Their pages do not list a note thread. An unverified request does not include a reply field. Owner writing defines that field.

##### Empty pages

When no public entry has the requested title, and a public entry has an inbound edge to that title, the response is 200. The page shows the title and the current titles of those public sources. Each source links to its view path, or to its canonical URL when it has no view path. The page does not include a draft body and does not say that a draft exists.

When no public entry has the title and no public inbound edge points at it, the response is 404.

### List feeds and titles

**Overview:** Human-readable feeds list deliverable entries. The title index lists public articles. Both pages contain ten items.

**Input:** One of the following paths. A later page uses the next-page URL from the previous response.

- `GET /`
- `GET /feed.xml`
- `GET /feed.json`
- `GET /feed/articles.xml`
- `GET /feed/notes.xml`
- `GET /feed/bookmarks.xml`
- `GET /pages`

**Output:** A page of ten items, or fewer on the last page. The response includes the next page's URL when more items exist.

#### Applicable conditions

##### Feeds

`GET /` is HTML. `GET /feed.xml` is Atom. `GET /feed.json` is JSON Feed. The three responses list the same deliverable entries. Atom is required. JSON Feed is an additional representation of the same items.

`GET /feed/articles.xml`, `GET /feed/notes.xml`, and `GET /feed/bookmarks.xml` are Atom feeds for that kind only. There is no per-kind JSON Feed.

A feed includes only deliverable entries, ordered by `publishedAt` descending. When `publishedAt` is equal, the immutable id descending breaks the tie. A page is excluded. A note that replies to another note is not deliverable, so it is absent from GET `/` and from these feeds. An imported page stays out of the feed until the owner changes its kind. Each item includes the body and uses the canonical URL as its item id. For a bookmark whose external URL starts with `http://` or `https://`, the link to the entry is that URL. For every other entry, the link is the view path when one exists, and otherwise the canonical URL.

The owner's API list of 50 entries is a different list. It is not this page size.

##### Title index

`GET /pages` lists titles of public articles. Order is updated time descending. When the updated time is equal, the immutable id descending breaks the tie. Each item shows the title and a permalink. It does not show the body. A note, a bookmark, and a page are omitted. An article whose title is empty is omitted. It is not the weblog feed. The title links to the view path, or to the canonical URL when the entry has no view path. The permalink links to that entry's canonical path `/e/{id}`. Its visible text is `パーマリンク`.

##### Pages of ten

Each of these responses returns ten items. The last page may be shorter. When no item exists, the response is 200 and the list is empty. When more items exist, the response includes the URL of the next page. The last page omits that URL. The pages partition the ordered list. They do not repeat an item or skip an item. Design chooses the shape of the next-page URL.

### Return a Gyazo image

**Overview:** Public HTML refers to this host for a Gyazo image whose object can be selected. The bytes come from the existing archive.

**Input:** `GET /gyazo/{imageId}.{extension}` for the bytes. Entry HTML for a body that contains a Gyazo URL.

**Output:** Image bytes, 404, or HTML that either refers to this host or keeps the original URL.

#### Applicable conditions

##### Bytes

The image URL is `https://weblog.yamanoku.net/gyazo/{imageId}.{extension}`. The host reads the object key from the index and returns that object's bytes. The index maps an image id to one or more object keys. A key includes the export directory name. The host does not list the bucket while serving a request. It does not upload Gyazo bytes. The stored body remains the original URL string.

A request for an image id and extension that the index does not have is 404 and includes no bytes. A request that is not this image path does not return archive bytes and does not list the bucket.

Each image response counts as one request toward the Workers free allowance of 100,000 requests a day.

##### Which URL the HTML uses

When the written URL ends with an extension that the index has for that image id, the HTML refers to this host with that extension. When the written URL has no extension and the index has one key, the HTML uses that key's extension. When the written URL has no extension and the index has more than one key, the HTML keeps the original URL and does not choose an object. When the index has no key, the HTML keeps the original URL.

The URLs that this rule rewrites are `i.gyazo.com` and `gyazo.com`.

#### Exceptional behavior

##### The free allowance is exhausted

When a read cannot run inside the free allowance, the response is not 404, 410, or 301. The reader can distinguish it from a missing entry and from a deleted entry. The app does not move onto a paid plan. The response does not ask the reader to buy a plan. Design chooses the status code inside those limits. Work that cannot run waits until 00:00 UTC or fails for that request.

## Data requirements

### Required data

- **Public entry:** Immutable id, kind, current title, body text, visibility, bookmark URL, `publishedAt`, updated time, canonical URL, and view path. Empty titles and entries with no view path stay readable at the canonical URL.
- **Edges:** Source id, the title written in the body, and the target id when a public target exists. Reading uses the edges already stored with the entry. This feature does not create entries or edges.
- **Past titles and redirects:** Enough to send an old public path to the current view path or the canonical URL. A draft is not a redirect target for an unauthenticated client.
- **Deletion record:** Whether a deleted id was delivered, so the HTML can return 404 or 410 without the deleted body. Owner writing defines that record.
- **Gyazo index:** Image id, extension, and object key including the export directory. The index lives in D1, which is the decision already made. Many keys may share one image id.
- **Local expansion on 2026-11-01:** 26.3 GiB. The same image id appeared in only one directory. 243 image ids had more than one extension. 2 metadata files had no file. The billed size of the bucket is not part of this measurement.

### Relationships

A feed item and a title-index item point at one public entry. An empty page points at the public entries whose edges name its title. An image URL points at one object key.

### Personal information

A public body, title, or bookmark URL may name the owner or another person. Those public entries are world-readable. Draft bodies are not in these responses. This feature collects no account data. Image bytes served at the public image URL are world-readable. The owner's visibility choice remains the publication decision. This feature adds no separate consent step.

## External service dependencies

- **Cloudflare Workers Free**
  - **Related user stories:** Read a public entry, read the feeds, walk titles, read a Gyazo image
  - **Reason for dependency:** The public host answers these reads on the Worker. Each Gyazo image response counts as one request.
  - **Contractual and usage decisions:** The free allowance is 100,000 requests a day. Past that allowance, the request fails or waits until 00:00 UTC. The app does not move itself onto a paid plan.

- **Cloudflare R2, bucket `gyazo-archives`**
  - **Related user stories:** Read a Gyazo image
  - **Reason for dependency:** The image bytes already exist in this bucket. This feature reads them and does not upload them again.
  - **Contractual and usage decisions:** Storage beyond 10 GB a month for this existing archive is outside the zero-yen target. This feature does not add a second copy of the bytes. A read is a Class B operation. The free allowance is 1 million Class A operations a month, 10 million Class B operations a month, and 10 GB of storage a month. The source is [R2 pricing](https://developers.cloudflare.com/r2/pricing/), last updated 2026-10-30.

- **Cloudflare D1**
  - **Related user stories:** Read a public entry, read the feeds, walk titles, read a Gyazo image
  - **Reason for dependency:** Public entries are read from the entry store. The Gyazo index is in the same D1 database.
  - **Contractual and usage decisions:** The free allowance is the [D1 allowance in the product](../../product.md). When a read cannot run, it fails until 00:00 UTC. The failure stays distinguishable from a missing entry. The app does not move itself onto a paid plan.

## Security considerations

These routes are available without login. The whole host is not placed behind the owner's browser login. The edit screen stays limited to the owner, as owner writing specifies.

An unauthenticated response does not include a draft body and does not show whether a draft exists. A deleted body is not returned. The stored body is plain text. Public HTML does not execute that text as HTML. The links this feature adds are the links described above.

The image route returns one object's bytes. It does not list the bucket.

## Open questions

None that block Design for this feature.

Article Markdown is rendered as the body HTML section says. The order for rendering icons, tables, formulas, and Cosense decoration is decided by the owner when that rendering's requirements are written. Until then, this feature shows that source text. Changing that order does not change the stored body or the edge rules.

The billed size of bucket `gyazo-archives` is unmeasured. The 26.3 GiB figure above is the local expansion, not a bill. No billed size is written until the owner measures it. This gap does not change the image URL. Storage beyond 10 GB a month stays outside the zero-yen target.
