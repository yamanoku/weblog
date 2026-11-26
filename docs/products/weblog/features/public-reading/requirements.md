# Public reading

[日本語](requirements.ja.md)

## About this document

An unauthenticated reader reads public entries, human-readable feeds, empty pages, and Gyazo images without logging in. The canonical body stays plain text. HTML for display is produced from that text.

The parent product is [weblog.yamanoku.net](../../product.md). Write rules are in [Owner writing](../owner-writing/requirements.md).

### Scope

- Unauthenticated HTML for `GET /`, `GET /{title}`, and `GET /e/{id}`
- The month calendar on the home page
- Links, under a date-titled diary, to the public entries created on that day
- Human-readable feeds
- Empty pages for titles that have public inbound edges and no public entry
- The public Gyazo image URL and the bytes it returns
- Links in public HTML
- After the first HTML response, a link to another public HTML page on this host updates the page in the browser and does not replace the whole document

### Out of scope

- Owner create, update, delete, browser authentication, and the CLI token
- The ActivityPub actor, Follow, signatures, sending activities, and Activity Streams for a live entry
- WebFinger, the outbox, followers, and the inbox
- Bulk import from Cosense
- The order of turning formulas and lines that start with `$` or `%` that remain in the body into HTML other than that source text
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

Scenario: A verified owner sees an edit link on a public article, bookmark, or page

- Given: The request is verified as the owner. One public article, one public bookmark, and one public page each have a view path. One public note exists.
- When: The owner opens each article, bookmark, and page view path and canonical URL, and also opens the note's canonical URL. An unverified caller opens the article view path.
- Then: Each article, bookmark, and page response for the owner is 200 and, after the entry, includes a link whose text is `edit` and whose target is that entry's GET `/edit/{id}`. The note response does not include that link. The unverified article response is 200 and does not include the link. The stored body is unchanged.

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

Scenario: When the owner opens a draft canonical URL, the page shows the draft

- Given: The request is verified as the owner. One entry is draft.
- When: The owner requests its canonical URL and does not ask for Activity Streams. An unverified client requests the same URL and the view path.
- Then: The owner's response is 200 HTML. It includes the body and says the entry is a draft. The unverified response matches a missing entry and does not say that the entry is a draft. The view path does not include the draft body.

Scenario: When a delivered entry was deleted, the HTML does not include the deleted body

- Given: The entry was delivered and then deleted. Owner writing defines the 410 response.
- When: An unauthenticated client requests the canonical URL and does not ask for Activity Streams.
- Then: The response is 410. It does not include the deleted body.

Scenario: When a bookmark is public, the HTML includes its external URL beside the title

- Given: A public bookmark has an external URL that is not a YouTube, Spotify, or Speaker Deck media URL from the later rules. The body may also mention other URLs. A public article exists.
- When: An unauthenticated client requests the bookmark's view path and its canonical URL, and does not ask for Activity Streams. The client also requests the article's view path.
- Then: On the bookmark's view path and canonical URL, the HTML shows that URL beside the title. When the URL starts with `http://` or `https://`, it is an external link whose text is the URL. Any other non-empty value is text, and it is not a link. The title text stays the stored title. The stored body is unchanged. The article page does not show a bookmark URL.

Scenario: When a body link is a YouTube or Spotify URL, the page shows an embed

- Given: A public article, bookmark, or page contains a Markdown link, or a bare `http` or `https` URL, for a YouTube video, short, live video, or playlist, or for a Spotify track, album, playlist, episode, show, or artist. The same URL also appears in fenced code. A public note contains that URL in its body.
- When: An unauthenticated client requests each entry's HTML.
- Then: The article, bookmark, or page shows an iframe for that media. A YouTube frame uses `https://www.youtube-nocookie.com`. A Spotify frame uses `https://open.spotify.com`. The stored body is unchanged. The fenced code stays text. The note shows the stored text and does not show an iframe.

Scenario: When a bookmark URL is a YouTube or Spotify URL, the page shows that embed in the article

- Given: A public bookmark's external URL is one of those media URLs. The bookmark also has a view path.
- When: An unauthenticated client requests the bookmark's view path and its canonical URL.
- Then: The article shows that embed after the heading. The heading does not contain the iframe. The page does not show an anchor whose text is the URL. The stored bookmark URL is unchanged.

Scenario: When a body link is a Speaker Deck URL, the page shows an embed

- Given: A public article, bookmark, or page contains a Markdown link, or a bare `http` or `https` URL, for `https://speakerdeck.com/{user}/{slug}`. One of those URLs has `?slide=` and a positive integer. The same URL also appears in fenced code. A public note contains that URL. Speaker Deck names a player for the deck.
- When: An unauthenticated client requests each entry's HTML.
- Then: The article, bookmark, or page shows an iframe whose src is `https://speakerdeck.com/player/` plus the player id Speaker Deck named. The positive `slide` value is on that src. The stored body is unchanged. The fenced code stays text. The note shows the stored text and does not show an iframe. The iframe title is the link text when that text is not itself a URL, and otherwise `Speaker Deck`.

Scenario: When Speaker Deck does not name a player, the deck URL stays a link

- Given: A public page contains a Speaker Deck deck URL. Speaker Deck does not name a player for it.
- When: An unauthenticated client requests that page's HTML.
- Then: The response is 200. That URL is an anchor. The page does not show an iframe for it. The stored body is unchanged.

Scenario: When a bookmark URL is a Speaker Deck URL, the page shows that embed in the article

- Given: A public bookmark's external URL is a Speaker Deck deck URL. Speaker Deck names a player for it. The bookmark also has a view path.
- When: An unauthenticated client requests the bookmark's view path and its canonical URL.
- Then: The article shows that embed after the heading. The heading does not contain the iframe. The page does not show an anchor whose text is the URL. The stored bookmark URL is unchanged.

Scenario: When a link href is http or https, its underline is dotted and its background is yellow

- Given: Public HTML has an anchor whose href is `https://example.com/a` and an anchor whose href is a path on this host. Another anchor has the href `HTTPS://example.com/b` and contains an image.
- When: An unauthenticated client opens that public HTML.
- Then: The underline of `https://example.com/a` is dotted, and its background is yellow. The path anchor's underline is solid, and it has no yellow background. Both keep the link text color they already had. `https://example.com/a` does not open a new browsing context. The href and the visible text stay unchanged. `HTTPS://example.com/b` has no underline, its background is yellow, and a dotted line surrounds its image. An anchor that contains a video is the same. The feed HTML fragment and the stored body stay unchanged.

### Read a note image

As an unauthenticated reader, I want the one image on a public note so that I can see it with that note. The image is not a Gyazo archive object. Owner writing decides when a note has that image.

**Acceptance criteria:**

Scenario: When a public note has an image, the page shows it under the body

- Given: One public note has a body and one image. Another public note has a body and no image.
- When: An unauthenticated client opens GET `/` and the canonical URL of each note, and does not ask for Activity Streams.
- Then: The note with an image includes its body and one image under that body. The image refers to this host at `/note-images/{id}` for that note. The image alt is the alternative text stored with that note. The note without an image includes no such image. The stored body does not contain that URL or that text.

Scenario: When the image URL is requested, the host returns the bytes

- Given: That note is public and the bytes are stored.
- When: An unauthenticated client requests `GET /note-images/{id}`.
- Then: The response is those bytes. The content type is `image/jpeg`, `image/png`, `image/gif`, or `image/webp`. The host does not list a bucket.

Scenario: When the entry is missing or not public, the image URL returns no bytes

- Given: The id is missing, the entry is missing or not public, or the entry has no image. A public note, article, bookmark, or page that stores the image is not this case.
- When: An unauthenticated client requests that image URL.
- Then: The response is 404 and includes no image bytes.

Scenario: When a public page stores an image, the image URL returns the bytes

- Given: One public page stores an image.
- When: An unauthenticated client requests `GET /note-images/{id}` for that image.
- Then: The response is those bytes. The page HTML does not list the image under the body. The image appears only where the stored Markdown places it.

### Open a dated diary from the month calendar

As an unauthenticated reader, I want the home page to show one month of dates so that I can open that day's diary.

**Acceptance criteria:**

Scenario: When the query is absent, the page shows the current month in Tokyo

- Given: Today's date in Tokyo is 2026-11-26. One public diary is titled `2026-11-26` and has a view path. Another public diary is titled `2026-11-01` and has a view path. A public article, a public note that is not a reply, a public bookmark, a public diary whose title is not a date, and a public page also exist. A draft diary is titled `2026-11-20`. A public article is titled `2026-11-21`. A public diary is titled `2026-11-22` and has no view path.
- When: An unauthenticated client requests `GET /`.
- Then: The response is 200 HTML. The month shown is November 2026, and the page lists every date from the first through the last day of that month. It marks the 26th as today. The dates `2026-11-26` and `2026-11-01` are links to those diaries' view paths. The 22nd and every other date are not links. The page does not show the body or title of the article, note, bookmark, non-date diary, page, or draft. It does not show a card grid. Dates outside the month are not links.

Scenario: When the reader moves to another month, a month with no diary is still shown

- Given: Today's date in Tokyo is 2026-11-26. No public diary is titled with a date in October 2026.
- When: An unauthenticated client requests `GET /?month=2026-10`.
- Then: The response is 200. The month shown is October 2026. No date in that month is a link. The HTML includes a link to September 2026 with the text `前の月` and a link to November 2026 with the text `次の月`. The November link target is `/`. The September link target is `/?month=2026-09`.

Scenario: When the month query is the current Tokyo month, the page matches GET /

- Given: Today's date in Tokyo is 2026-11-26.
- When: An unauthenticated client requests `GET /?month=2026-11`.
- Then: The response is 200. The month and the linked dates match `GET /`.

Scenario: When month is not a calendar month, the response is 400

- Given: One public diary exists.
- When: An unauthenticated client requests `GET /?month=2026-13`, `GET /?month=2026-1`, or `GET /?month=2026-11-26`.
- Then: The response is 400. The body is `invalid_month`. The response is not a calendar.

Scenario: When a page query is present, the calendar ignores it

- Given: Today's date in Tokyo is 2026-11-26. Twenty-five deliverable entries exist.
- When: An unauthenticated client requests `GET /?page=2`, `GET /?page=0`, or `GET /?page=2a`. Another request is `GET /?month=2020-01&page=2`.
- Then: Each response that has only `page` is 200 and shows the same month as `GET /`. It does not list items from the thirteenth onward. The body is not `invalid_page`. The response that has both `month` and `page` is 200 and shows January 2020.

### Open the same day's writing under a dated diary

As an unauthenticated reader, I want to open the article, short post, or bookmark written on a diary's date from below that diary, so that I can move between the diary and the other public entries from that day.

**Acceptance criteria:**

Scenario: When a public entry's creation date in Tokyo matches the diary title, the diary page lists it below the body

- Given: A public diary is titled `2026-11-26` and has a view path. Public article A has `created_at` `2026-11-25T15:00:00.000Z`, which is 2026-11-26 00:00 in Tokyo. Public bookmark C has a non-empty title and a view path, and its `created_at` is `2026-11-26T03:00:00.000Z`. Public note B is not a reply to another note, has no view path, and its `created_at` is `2026-11-26T14:59:59.999Z`, which is 2026-11-26 23:59:59.999 in Tokyo. Public article D has `created_at` `2026-11-26T15:00:00.000Z`, which is 2026-11-27 00:00 in Tokyo.
- When: An unauthenticated client requests that diary's view path and its canonical URL.
- Then: Both responses are 200. After the diary body, the heading is `当日書いたコンテンツ`. The links under it are A, then C, then B. An equal creation time is ordered by the immutable id ascending. The links for A and C are their view paths. The link for B is its canonical URL. Each link's text is that entry's non-empty title. D is absent. C's link is not the bookmark's external URL.

Scenario: When a same-day entry has an empty title, the link text is the canonical URL

- Given: A public diary is titled `2026-11-26`. A public note is not a reply, and its title is empty. The Tokyo date of its `created_at` is 2026-11-26.
- When: An unauthenticated client requests that diary's view path.
- Then: The same-day link's text is that note's canonical URL. The link target is the path of that canonical URL.

Scenario: When the only same-day rows are a reply, a draft, another diary, or a page, the heading is absent

- Given: A public diary is titled `2026-11-26`. Each of the following has a Tokyo creation date of 2026-11-26: a public note that replies to another note, a draft article, a public diary whose title is not a date, and a public page. No other public article, note, or bookmark was created that day.
- When: An unauthenticated client requests that dated diary's view path.
- Then: The response is 200 and includes the diary body. The heading `当日書いたコンテンツ` is absent. The reply, the draft, the other diary, and the page are absent.

Scenario: When the diary title is not a date, the page omits the same-day list

- Given: A public diary's title is not a date. A public article's Tokyo creation date matches the Tokyo date of that diary's `created_at`.
- When: An unauthenticated client requests that diary's view path.
- Then: The response is 200 and includes the diary body. The heading `当日書いたコンテンツ` is absent.

Scenario: When the owner opens a draft diary whose title is a date, the page lists the public entries from that day

- Given: The request is verified as the owner. The diary is a draft titled `2026-11-26`. A public article's Tokyo creation date is 2026-11-26.
- When: The owner requests that canonical URL without asking for Activity Streams. An unverified client requests the same URL.
- Then: The owner's response is 200. It includes the draft body, says the entry is a draft, and includes the heading `当日書いたコンテンツ` plus a link to that article. The unverified response matches a missing entry and omits that list.

### Read the human-readable feeds

As an unauthenticated reader, I want to read a feed of deliverable entries so that I can follow new articles, short posts, and bookmarks.

**Acceptance criteria:**

Scenario: When deliverable entries exist, the first feed page lists ten of them

- Given: More than ten deliverable entries exist. A page is public and is not deliverable.
- When: An unauthenticated client requests `GET /feed.xml` or `GET /feed.json`.
- Then: Each response lists ten deliverable entries. Order is `updatedAt` descending, then the immutable id descending. A public page is absent. Each item includes the full body. The item id is the canonical URL. The feeds are not divided by date.

Scenario: When more than ten deliverable entries exist, the response offers the next page

- Given: Eleven deliverable entries exist.
- When: An unauthenticated client requests the first feed page.
- Then: The response includes the URL of the next page. That page contains the remaining entry and no URL for a further page.

Scenario: When no deliverable entry exists, the feed is an empty success

- Given: No deliverable entry exists.
- When: An unauthenticated client requests `GET /feed.xml` or `GET /feed.json`.
- Then: The response is 200. It has no items. The response is not 404.

Scenario: When the reader asks for one kind, the Atom feed contains only that kind

- Given: Deliverable articles, notes, and bookmarks exist.
- When: An unauthenticated client requests `GET /feed/articles.xml`, `GET /feed/notes.xml`, or `GET /feed/bookmarks.xml`.
- Then: Each feed contains only that kind, with the same page size and order as `GET /feed.xml`.

### Walk titles

As an unauthenticated reader, I want to open a title that has no entry yet so that public pages form a link graph.

**Acceptance criteria:**

Scenario: When a title has no public entry and has a public inbound edge, the host returns an empty page

- Given: No public entry has the title. A public entry has an inbound edge to that title. A draft with that title may exist.
- When: An unauthenticated client requests that title path.
- Then: The response is 200. It includes the title and the current titles of the public sources. It does not include a draft body. It does not create an entry.

Scenario: When a title has no public entry and no public inbound edge, the response is 404

- Given: No public entry has the title. No public inbound edge points at the title.
- When: An unauthenticated client requests that title path.
- Then: The response is 404. It does not include a draft body. It does not create an entry.

Scenario: The owner can start an entry from a missing title

- Given: No public entry has the title `ぼくのなつやすみ`. The request is verified as the owner.
- When: The owner opens that title path. An unverified caller opens the same path.
- Then: The owner's response includes a link whose visible text is `作成`. The link opens GET `/new?title=` plus that title percent-encoded. The unverified response omits the link. Neither response stores an entry.

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

Scenario: When one bracket holds a Gyazo URL and another URL, the image links there

- Given: A public body contains a bracket whose text is only a Gyazo URL and one other `http` or `https` URL. The index can select one image or video extension for that image id.
- When: An unauthenticated client requests the entry HTML.
- Then: The HTML shows that image or video inside a link to the other URL. The image alt is the original Gyazo URL. The stored body still contains the original bracket.

Scenario: When that bracket does not identify one image or video, both URLs are links

- Given: A public body contains that same bracket. The index cannot select one image or video extension for that image id.
- When: An unauthenticated client requests the entry HTML.
- Then: The HTML shows no image and no video for that bracket. Both URLs are links. A Gyazo URL with one non-image extension links to this host. Any other Gyazo URL stays the original URL.

Scenario: When the written URL does not identify one object, the HTML keeps the original URL

- Given: A public body contains a Gyazo URL with no extension. The index has more than one object key for that image id.
- When: An unauthenticated client requests the entry HTML.
- Then: The HTML keeps that original URL. It does not choose one of the objects.

### Read a page icon

As an unauthenticated reader, I want a `[Title.icon]` bracket in a public article, bookmark, or page to show that page's icon image. The bytes come from the existing Gyazo archive, and the stored body stays the bracket.

**Acceptance criteria:**

Scenario: The named public entry's first image is one archived Gyazo still image

- Given: The public body contains `[Copilot.icon]` outside inline code and fenced code. Exactly one public entry has the current title `Copilot`. The first image in that entry's stored body is a Gyazo URL. The Gyazo index can choose one still-image extension for that image id. `png`, `jpg`, `jpeg`, `gif`, and `webp` are still images. An `mp4` row is not that choice.
- When: An unauthenticated client requests that entry's HTML.
- Then: The HTML shows an image whose source is `https://weblog.yamanoku.net/gyazo/{imageId}.{extension}` and whose alt text is `Copilot`. The image is inside a link to that entry's view path when it has one, and otherwise to `/e/{id}`. The stored body still contains `[Copilot.icon]`. The host does not add an edge. The host does not read a draft body.

Scenario: No public entry has the title, and the shipped icon list names one archived still image

- Given: The public body contains `[Copilot.icon]` outside inline code and fenced code. No public entry has the current title `Copilot`. The icon list shipped with the Worker names that title, a Gyazo image id, one still-image extension, and the object key in `gyazo-archives`.
- When: An unauthenticated client requests that entry's HTML.
- Then: The HTML shows an image whose source is `https://weblog.yamanoku.net/gyazo/{imageId}.{extension}` and whose alt text is `Copilot`. The image is inside a link to `/` plus the percent-encoded title, with each space written as `_`. The stored body still contains `[Copilot.icon]`. The host does not add an edge. The host does not write D1.

Scenario: The icon cannot be chosen

- Given: The public body contains `[Copilot.icon]`. More than one public entry has that current title, or the one public entry's first image is not a Gyazo URL, or no public entry has that title and the shipped icon list has no entry for it, or the index cannot choose one still-image extension.
- When: An unauthenticated client requests that entry's HTML.
- Then: The HTML shows the source text `[Copilot.icon]`. It shows no image for that bracket. The stored body stays the bracket.

Scenario: The bracket is inside code, or the entry is a note

- Given: `[Copilot.icon]` is inside inline code or fenced code, or the public entry is a note.
- When: An unauthenticated client requests that entry's HTML.
- Then: The HTML shows that bracket as source text. A note keeps the stored lines.

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

A public entry has visibility public. Draft bodies stay out of unauthenticated responses, the home calendar, the feeds, and view paths. The owner's GET `/e/{id}` includes that draft body and says the entry is a draft. A draft is indistinguishable from a missing entry for an unauthenticated client. Reading does not create an entry.

The kinds are article, diary, note, bookmark, and page. A public page and a public diary are readable at their URLs. Deliverable entries, feeds, and `publishedAt` are defined by [Owner writing](../owner-writing/requirements.md). This feature does not send activities.

The canonical URL is `https://weblog.yamanoku.net/e/{id}`. A title change does not change it. Activity Streams for a live entry belong to the ActivityPub feature. This feature returns HTML when the request does not ask for Activity Streams.

A deleted id follows owner writing. A delivered deleted id is 410 and the HTML includes no deleted body. An undelivered deleted id is 404. Neither response includes the deleted body.

##### View path and redirects

The view path is `/{title}` after the title rules in owner writing. Spaces become `_` before percent-encoding. An empty-title note has no view path and is public only at its canonical URL. It is not a title-resolution target.

Titles that share a path after spaces become `_` get no view path. Both stay public only at their canonical URLs. A title whose comparison key is `gyazo` gets no view path.

An old path of a public entry redirects with 301 to the current view path. When the entry has no view path, the redirect target is the canonical URL. An unauthenticated client is not redirected to a draft. That request is handled as a missing title.

##### HTML of the body

The stored body stays plain text. Public HTML does not replace that string.

Public HTML for an article, a bookmark, or a page renders the stored body as Markdown. It turns paragraphs separated by blank lines, headings of one to six `#` followed by a space, unordered lists that start with `-` or `*`, and two leading spaces per nested list level, lines that start with `>`, a list item whose text starts with `>` (consecutive items of that form at the same level are one quotation), `*` and `**` emphasis, `***` for bold and italic, `~~` strikethrough, inline code in backticks, fenced code, `[label](URL)` links, and `![text](URL)` images into HTML. A pipe table becomes a table with a header and a body. A `Table: name` line immediately before it is that table's caption. A link or image URL is only `http`, `https`, or a path on this host. The image alt is the text between the brackets, and it may be empty. Raw HTML in the body is escaped and is not executed. A bookmark also lists every stored image under the body, in stored order, even when the Markdown already contains it. An article and a page do not add that list. An article or page image appears in the HTML only where the Markdown places it. The image source is `/note-images/{id}` for that image. For a note, that id is the note id. Links in a page are the Markdown links stored in the body. Rendering does not walk Cosense brackets again, except a bracket that is only a Gyazo URL and one other `http` or `https` URL, and a bracket that is `/project` or `/project/page title`. The label of a `[label](URL)` link may contain `[` and `]`. The URL is the one after the `]` that balances the opening `[`. A nested `[text](URL)` inside that label is shown as that text. It is not a second anchor. The page does not show the raw `](URL)`.

A fenced code block that is itself a list item renders as that `li` containing `pre` containing `code`. The info string is not shown. The code characters are escaped, so links and emphasis inside them stay characters. A list item whose whole text is `code:` plus an info string renders the same way when nested list items follow it before the next item at the same level. The info string may contain spaces, as in `code:css`, `code:js`, `code:html`, and `code:template strings.js`. A space immediately after the colon is not that form. Pages imported before an indented `code:` block stayed a list item stored each code line as its own nested list item. Those nested items are the code lines, in order. The leading spaces on a line are that item's list level, minus the `code:` item's list level, minus one.

A YouTube or Spotify link in an article, a bookmark, or a page becomes an embed. The stored characters stay the link. The YouTube forms are a video in `/watch`, `/shorts`, `/live`, `/embed`, or `youtu.be`, and a playlist. The frame origin is `https://www.youtube-nocookie.com`. A `t` or `start` time is kept. The Spotify forms are a track, album, playlist, episode, show, or artist, including an `intl-` prefix. The frame origin is `https://open.spotify.com`. Share parameters are not copied into the frame. The iframe title is the link text when that text is not itself a URL, and otherwise `YouTube` or `Spotify`. A URL inside inline code or fenced code stays text. Any other link stays an anchor. A note does not embed.

A Speaker Deck link in an article, a bookmark, or a page becomes an embed when Speaker Deck names a player. The public form is `https://speakerdeck.com/{user}/{slug}`. The frame origin is `https://speakerdeck.com`. The src is `https://speakerdeck.com/player/` plus the player id. A `slide` query that is a positive integer of at most four digits is kept. Other query parameters are not copied. A URL that is already that player address is the same embed. A profile URL, one path segment, stays an anchor. When Speaker Deck does not name a player, the URL stays an anchor and the page stays 200. The iframe title is the link text when that text is not itself a URL, and otherwise `Speaker Deck`. A URL inside inline code or fenced code stays text. A note does not embed. The stored characters stay the link. At most 20 distinct decks on one page are asked. Any further deck URL stays an anchor.

On a public HTML page, an anchor whose href starts with `http://` or `https://` has a dotted underline and a yellow background. The comparison ignores case. An absolute URL on this host is dotted, with a yellow background, when it uses that scheme. An anchor whose href is a path on this host keeps a solid underline and has no yellow background. The text color stays unchanged. The page does not open a new browsing context. The href and the visible text stay unchanged. When the anchor contains an image or a video, it has no underline, its background is yellow, and a dotted line surrounds that image or video. The feed HTML fragment gains no class for this mark. The stored body stays unchanged.

Public HTML for a note keeps the stored lines.

On a bookmark's view path and canonical page, an external URL that is not a media embed is shown beside the title. An `http` or `https` value that is a YouTube or Spotify media URL from the rule above, or a Speaker Deck URL whose player is known, is that embed, not an anchor. The article contains that embed after the heading, and the heading does not contain the iframe. Any other `http` or `https` value is an external link whose text is the URL, beside the title. Any other non-empty value is text, and it is not a link. The host does not insert that URL into the stored body.

When the request is verified as the owner, the view path and the canonical page of a public article, a public bookmark, or a public page include, after the entry, a link whose visible text is `edit` and whose target is GET `/edit/{id}` for that entry. An unverified request omits that link. A public note omits it. The stored body does not change. Owner writing defines the edit screen that link opens.

A stored bracket `[/project]` or `[/project/page title]` is a link to `https://scrapbox.io/project` or `https://scrapbox.io/project/` plus the percent-encoded page title. The link text is the page title, or the project name when the bracket has no page. The project name is the first path segment. This link is not an edge on this host. A bracket `[Title.icon]` outside inline code and fenced code is that page's icon, as the page-icon story says. Formulas and lines that start with `$` or `%` that remain in the body stay source text. The order of HTML for those is decided when that rendering's requirements are written.

A `i.gyazo.com` or `gyazo.com` URL uses the image rule below. A bracket that holds only that URL and one other `http` or `https` URL shows the image or video inside a link to the other URL. When the Gyazo URL does not identify one image or video, that bracket shows both URLs as links and shows no image. A `scrapbox.io/files` URL stays the original URL string. This feature does not copy that file.

##### Note thread

The canonical page of a public note lists every public note in its thread. The order is created time ascending, then the immutable id ascending. The first note shows no reply target. A later note shows the note it replies to when that note is still in the thread. When the target is absent, the later note stays in the thread and shows no reply target. Opening any remaining note in the thread returns that same list. A deleted id follows owner writing and does not return the deleted body. An article, a bookmark, and a page stay one entry. Their pages do not list a note thread. An unverified request does not include a reply field. Owner writing defines that field.

##### Empty pages

When no public entry has the requested title, and a public entry has an inbound edge to that title, the response is 200. The page shows the title and the current titles of those public sources. Each source links to its view path, or to its canonical URL when it has no view path. The page does not include a draft body and does not say that a draft exists.

When no public entry has the title and no public inbound edge points at it, the response is 404.

When no public entry has the title and the request is verified as the owner, the title path includes a link whose visible text is `作成`. The target is GET `/new?title=` plus the path title percent-encoded. An unverified request omits the link. The host stores no entry. Owner writing defines the create form that link opens.

### Show the month calendar

**Overview:** The home page shows the dates of one month. A date is a link only when a public diary is titled with that `YYYY-MM-DD` and has a view path. The link target is that view path.

**Input:** `GET /`. Another month is `GET /?month=YYYY-MM`.

**Output:** HTML for that month. When `month` is not a calendar month, the response is 400 `invalid_month`.

#### Applicable conditions

`GET /` is HTML. When the `month` query is absent or empty, the month is the month that contains today's date in `Asia/Tokyo`. `month` is a four-digit year, a hyphen, and a two-digit month. The month is 01 through 12. The leading zero is required. Any other `month` is 400 `invalid_month`. The body is `text/plain; charset=utf-8`, and the response is not a calendar. A `page` query is ignored. When both `month` and `page` are present, the response shows the `month`. When `month` is not a calendar month, the response is 400 even if `page` is also present.

The response lists every date from the first through the last day of that month. The year and the month are identifiable. When today falls in that month, the page marks that date as today. Dates outside the month are not links.

A date is a link when a public diary meets all of the following. Its visibility is public. Its kind is diary. Its title equals that date written as `YYYY-MM-DD`. It has a view path. The link target is that view path. A draft, an article, a note, a bookmark, a page, a diary whose title is not a date, and a diary with no view path are not links. The home page does not show their bodies or titles. It is not a card grid.

The page links to the previous month and the next month. The texts are `前の月` and `次の月`. When the target month is the current month in Tokyo, the href is `/`. Otherwise the href is `/?month=` plus `YYYY-MM`. A month with no diary is still 200, and its dates are not links.

Stored rows are unchanged. No new column is required.

### Add the same day's entries under a dated diary

**Overview:** The HTML for a diary whose title is `YYYY-MM-DD` lists, after the body, the public articles, notes, and bookmarks created on that Tokyo date.

**Input:** That diary's view path, or its canonical URL.

**Output:** The diary HTML. When same-day entries exist, the heading is `当日書いたコンテンツ` and the links follow it. When none exist, that heading is absent.

#### Applicable conditions

The subject is a diary whose whole title is a real calendar date written `YYYY-MM-DD`. For a public diary, both the view path and the canonical URL include this list. For a draft diary, only the owner's canonical URL includes this list. An unverified request treats that draft as a missing entry. A diary whose title is not this shape omits the list.

The list includes an article, a note, or a bookmark whose visibility is public. The note is not a reply to another note. The Tokyo date of `created_at` equals the date in the diary title. A draft, a reply, another diary, and a page are excluded. The diary itself is excluded.

Order is `created_at` ascending. An equal time is ordered by the immutable id ascending. The link target is the view path when one exists, and otherwise the canonical URL. It is not a bookmark's external URL. The link text is the non-empty title. When the title is empty, the link text is the canonical URL. The list does not include the body. When no entry qualifies, the heading `当日書いたコンテンツ` is absent.

This list is not in the feeds. It is not on the home calendar.

### List feeds

**Overview:** Human-readable feeds list deliverable entries. A feed page contains ten items.

**Input:** One of the following paths. A later page uses the next-page URL from the previous response.

- `GET /feed.xml`
- `GET /feed.json`
- `GET /feed/articles.xml`
- `GET /feed/notes.xml`
- `GET /feed/bookmarks.xml`

**Output:** A feed page of ten items, with fewer on the last page. The response includes the next page's URL when more items exist.

#### Applicable conditions

##### Feeds

`GET /feed.xml` is Atom. `GET /feed.json` is JSON Feed. The two feeds list the same deliverable entries. Atom is required. JSON Feed is an additional representation of the same items. A public diary is already deliverable.

`GET /feed/articles.xml`, `GET /feed/notes.xml`, and `GET /feed/bookmarks.xml` are Atom feeds for that kind only. There is no per-kind JSON Feed.

A feed includes only deliverable entries, ordered by `updatedAt` descending. When `updatedAt` is equal, the immutable id descending breaks the tie. A public diary is included in the feeds. A page that is still kind page is excluded from the feeds. A note that replies to another note is not deliverable, so it is absent from these feeds. Each item includes the body and uses the canonical URL as its item id. For a bookmark whose external URL starts with `http://` or `https://`, the link to the entry is that URL. For every other entry, the link is the view path when one exists, and otherwise the canonical URL.

The owner's API list of 50 entries is a different list. It does not share this page size.

##### Pages of ten

A feed response returns ten items. The last page may be shorter. When no item exists, the response is 200 and the list is empty. When more items exist, the response includes the URL of the next page. The last page omits that URL. The pages partition the ordered list. They do not repeat an item or skip an item.

A feed's next-page URL is the shape Design records for that feed.

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

A feed item points at one public entry. An empty page points at the public entries whose edges name its title. An image URL points at one object key.

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

Article Markdown is rendered as the body HTML section says. A `[Title.icon]` bracket follows the page-icon story. The order for rendering formulas, lines that start with `$` or `%`, and the remaining Cosense decoration is decided by the owner when that rendering's requirements are written. Until then, this feature shows that source text. Changing that order does not change the stored body or the edge rules.

The billed size of bucket `gyazo-archives` is unmeasured. The 26.3 GiB figure above is the local expansion, not a bill. No billed size is written until the owner measures it. This gap does not change the image URL. Storage beyond 10 GB a month stays outside the zero-yen target.
