# Public reading

[日本語](requirements.ja.md)

## About this document

An unauthenticated reader reads public entries, human-readable feeds, empty pages, and Gyazo images without logging in. The canonical body stays plain text. HTML for display is produced from that text.

The parent product is [weblog.yamanoku.net](../../product.md). Write rules are in [Owner writing](../owner-writing/requirements.md).

### Scope

- Unauthenticated HTML for `GET /`, `GET /{title}`, and `GET /e/{id}`
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

Scenario: When a public bookmark is listed, its title opens the external URL

- Given: A public bookmark has an external URL that starts with `http://` or `https://`. It also has a view path.
- When: An unauthenticated client opens GET `/`.
- Then: The title's link is that external URL. It is not the view path and not the canonical URL. A direct request for the canonical URL still returns that entry's HTML.

Scenario: When a body link is a YouTube or Spotify URL, the page shows an embed

- Given: A public article, bookmark, or page contains a Markdown link, or a bare `http` or `https` URL, for a YouTube video, short, live video, or playlist, or for a Spotify track, album, playlist, episode, show, or artist. The same URL also appears in fenced code. A public note contains that URL in its body.
- When: An unauthenticated client requests each entry's HTML.
- Then: The article, bookmark, or page shows an iframe for that media. A YouTube frame uses `https://www.youtube-nocookie.com`. A Spotify frame uses `https://open.spotify.com`. The stored body is unchanged. The fenced code stays text. The note shows the stored text and does not show an iframe.

Scenario: When a bookmark URL is a YouTube or Spotify URL, the page shows that embed in the article

- Given: A public bookmark's external URL is one of those media URLs. The bookmark also has a view path.
- When: An unauthenticated client requests the bookmark's view path and its canonical URL, and also opens GET `/`.
- Then: The article shows that embed after the heading. The heading does not contain the iframe. The page does not show an anchor whose text is the URL. The home list title still links to the external URL. The stored bookmark URL is unchanged.

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
- When: An unauthenticated client requests the bookmark's view path and its canonical URL, and also opens GET `/`.
- Then: The article shows that embed after the heading. The heading does not contain the iframe. The page does not show an anchor whose text is the URL. The home list title still links to the external URL. The stored bookmark URL is unchanged.

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

### Read the human-readable feeds

As an unauthenticated reader, I want to read a feed of deliverable entries so that I can follow new articles, short posts, and bookmarks.

**Acceptance criteria:**

Scenario: When deliverable entries exist, the first home page lists twelve of them

- Given: More than twelve deliverable entries exist. A page is public and is not deliverable.
- When: An unauthenticated client requests `GET /`, `GET /feed.xml`, or `GET /feed.json`.
- Then: `GET /` lists twelve entries from the deliverable entries and the public pages together. On the home list, a public page with a source updated time uses that time, and every other entry uses `updatedAt`, newest first. An equal time breaks the tie by the immutable id descending. `GET /feed.xml` and `GET /feed.json` list ten deliverable entries. Feed order is `updatedAt` descending, then the immutable id descending. A public page is absent from the feeds. Each item includes the body. On the `GET /` card, that body shows at most 100 characters. A longer body shows those 100 characters followed by `…`. The title and the images are outside that count. A page card counts the words a reader would see, the same way an article card does. A feed still includes the full body. The item id is the canonical URL. The HTML for `GET /` places those items in one wrapping grid of cards. The column count follows the width of the list. The list does not divide items by date. The feeds are not divided by date.

Scenario: When more than ten deliverable entries exist, the response offers the next page

- Given: Eleven deliverable entries exist.
- When: An unauthenticated client requests the first feed page.
- Then: The response includes the URL of the next page. That page contains the remaining entry and no URL for a further page.

Scenario: When the reader opens the second page of the home list

- Given: Twenty-five deliverable entries exist.
- When: An unauthenticated client requests `GET /?page=2`.
- Then: The response is 200 and lists the thirteenth through the twenty-fourth entries, in the same order as `GET /`. The HTML links to `/` with the text `前へ` and to `/?page=3` with the text `次へ`. The link to the first page is `/` and has no `page` query.

Scenario: When `page` is not a page number

- Given: A deliverable entry exists.
- When: An unauthenticated client requests `GET /?page=0` or `GET /?page=2a`.
- Then: The response is 400. The body is `invalid_page`. The response is not an empty HTML list.

Scenario: When `page` is past the last home page

- Given: Eleven deliverable entries exist.
- When: An unauthenticated client requests `GET /?page=3`.
- Then: The response is 404.

Scenario: When no deliverable entry exists, the feed is an empty success

- Given: No deliverable entry exists. No public page exists.
- When: An unauthenticated client requests `GET /`.
- Then: The response is 200. The list is empty. The response is not 404.

Scenario: When no deliverable entry exists and a public page does, the home list shows that page

- Given: No deliverable entry exists. One public page exists.
- When: An unauthenticated client requests `GET /`.
- Then: The response is 200. The list includes that page. The response is not 404. The feeds omit that page.

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

A public entry has visibility public. Draft bodies stay out of unauthenticated responses, the home list, the feeds, and view paths. The owner's GET `/e/{id}` includes that draft body and says the entry is a draft. A draft is indistinguishable from a missing entry for an unauthenticated client. Reading does not create an entry.

The kinds are article, note, bookmark, and page. A public page is readable at its URL. Deliverable entries, feeds, and `publishedAt` are defined by [Owner writing](../owner-writing/requirements.md). This feature does not send activities.

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

On a bookmark's view path and canonical page, an external URL that is not a media embed is shown beside the title. An `http` or `https` value that is a YouTube or Spotify media URL from the rule above, or a Speaker Deck URL whose player is known, is that embed, not an anchor. The article contains that embed after the heading, and the heading does not contain the iframe. Any other `http` or `https` value is an external link whose text is the URL, beside the title. Any other non-empty value is text, and it is not a link. The host does not insert that URL into the stored body. The home list title of a bookmark still opens the external URL.

When the request is verified as the owner, the view path and the canonical page of a public article, a public bookmark, or a public page include, after the entry, a link whose visible text is `edit` and whose target is GET `/edit/{id}` for that entry. An unverified request omits that link. A public note omits it. The stored body does not change. Owner writing defines the edit screen that link opens.

A stored bracket `[/project]` or `[/project/page title]` is a link to `https://scrapbox.io/project` or `https://scrapbox.io/project/` plus the percent-encoded page title. The link text is the page title, or the project name when the bracket has no page. The project name is the first path segment. This link is not an edge on this host. A bracket `[Title.icon]` outside inline code and fenced code is that page's icon, as the page-icon story says. Formulas and lines that start with `$` or `%` that remain in the body stay source text. The order of HTML for those is decided when that rendering's requirements are written.

A `i.gyazo.com` or `gyazo.com` URL uses the image rule below. A bracket that holds only that URL and one other `http` or `https` URL shows the image or video inside a link to the other URL. When the Gyazo URL does not identify one image or video, that bracket shows both URLs as links and shows no image. A `scrapbox.io/files` URL stays the original URL string. This feature does not copy that file.

##### Note thread

The canonical page of a public note lists every public note in its thread. The order is created time ascending, then the immutable id ascending. The first note shows no reply target. A later note shows the note it replies to when that note is still in the thread. When the target is absent, the later note stays in the thread and shows no reply target. Opening any remaining note in the thread returns that same list. A deleted id follows owner writing and does not return the deleted body. An article, a bookmark, and a page stay one entry. Their pages do not list a note thread. An unverified request does not include a reply field. Owner writing defines that field.

##### Empty pages

When no public entry has the requested title, and a public entry has an inbound edge to that title, the response is 200. The page shows the title and the current titles of those public sources. Each source links to its view path, or to its canonical URL when it has no view path. The page does not include a draft body and does not say that a draft exists.

When no public entry has the title and no public inbound edge points at it, the response is 404.

When no public entry has the title and the request is verified as the owner, the title path includes a link whose visible text is `作成`. The target is GET `/new?title=` plus the path title percent-encoded. An unverified request omits the link. The host stores no entry. Owner writing defines the create form that link opens.

### List feeds

**Overview:** Human-readable feeds list deliverable entries. A feed page contains ten items. The home HTML list contains twelve.

**Input:** One of the following paths. A later page uses the next-page URL from the previous response.

- `GET /`
- `GET /feed.xml`
- `GET /feed.json`
- `GET /feed/articles.xml`
- `GET /feed/notes.xml`
- `GET /feed/bookmarks.xml`

**Output:** A feed page of ten items, or a home page of twelve, with fewer on the last page. The response includes the next page's URL when more items exist.

#### Applicable conditions

##### Feeds

`GET /` is HTML. `GET /feed.xml` is Atom. `GET /feed.json` is JSON Feed. The two feeds list the same deliverable entries. Atom is required. JSON Feed is an additional representation of the same items. The home HTML adds public pages to those deliverable entries.

`GET /feed/articles.xml`, `GET /feed/notes.xml`, and `GET /feed/bookmarks.xml` are Atom feeds for that kind only. There is no per-kind JSON Feed.

A feed includes only deliverable entries, ordered by `updatedAt` descending. When `updatedAt` is equal, the immutable id descending breaks the tie. A page is excluded from the feeds. A note that replies to another note is not deliverable, so it is absent from GET `/` and from these feeds. An imported page stays out of the feed until the owner changes its kind. `GET /` adds public pages to the deliverable entries. On that list, a public page with a source updated time uses that time, and every other entry uses `updatedAt`, newest first. An equal time breaks the tie by the immutable id descending. Each item includes the body and uses the canonical URL as its item id. For a bookmark whose external URL starts with `http://` or `https://`, the link to the entry is that URL. For every other entry, the link is the view path when one exists, and otherwise the canonical URL.

The owner's API list of 50 entries is a different list. It is not this page size.

##### Pages of ten and twelve

A feed response returns ten items. `GET /` returns twelve. The last page may be shorter. When no item exists, the response is 200 and the list is empty. When more items exist, the response includes the URL of the next page. The last page omits that URL. The pages partition the ordered list. They do not repeat an item or skip an item.

For `GET /`, the next page is `/?page=` plus the 1-based page number. The second page is `/?page=2`. The first page omits `page`. `page=1` lists the same entries as the URL without `page`. A feed's next-page URL is the shape Design records for that feed.

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
