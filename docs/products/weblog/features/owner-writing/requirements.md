# Owner writing

[日本語](requirements.ja.md)

## About this document

The owner creates, updates, publishes, deletes, and reads entries from the browser and the CLI under the same rules. The canonical URL is fixed once at creation and stays when the title changes. The body and the edges made from that body commit in the same update.

The parent product is [weblog.yamanoku.net](../../product.md).

### Scope

- Owner create, update, publish, return to draft, delete, get-one, and list
- Browser authentication of the owner, and the CLI token
- Immutable IDs, canonical URLs, view paths, and redirects after a rename
- Keeping draft bodies out of unauthenticated responses
- Making edges from the body and committing them with the entry
- The edit screen runs in the browser after the first HTML. Submitting the fields uses the same write rules as the CLI

### Out of scope

- The format, page size, and presentation of human-readable feeds and the HTML of an empty page. The public-reading feature decides those. This feature still forbids putting a draft body on those responses.
- The ActivityPub actor, Follow, signatures, and sending activities. This feature records the state needed to decide delivery. It does not send activities.
- Putting a bookmark's external URL into the body of a delivered Note as a link. This feature stores that URL as a field separate from the body.
- Bulk import from Cosense, retries, and merging a local edit with a newer source page. When import writes an entry, it passes this feature's validation and the same entry-and-edge update boundary. Import has no path that stores an entry directly.
- Public image URLs, rendering of notation other than links, and the ORM. Attaching the one note image is in scope. The public URL and the bytes a reader receives are in [Public reading](../public-reading/requirements.md).
- More than one image on a note, and an image on a reply. An article, a bookmark, and a page may have many images. The CLI does not send those images.
- More than one owner, signup, and merging fields from concurrent edits.

## User stories

### Create an entry

As the owner, I want to create an entry from the browser or the CLI so that articles, short posts, bookmarks, and pages live on one host and the canonical URL is fixed once.

**Acceptance criteria:**

Scenario: When the required fields are present, the host stores the entry and issues a stable canonical URL

- Given: The request is verified as the owner by browser authentication or a valid CLI token. No entry has the new immutable ID.
- When: The owner submits kind, title, body, and visibility. When the kind is bookmark, the owner also submits an external URL.
- Then: One entry exists. The immutable ID is issued once at creation. The canonical URL is `https://weblog.yamanoku.net/e/{id}`. A later title change does not change this URL.

Scenario: When a title-required kind has an empty title, the host stores nothing

- Given: The request is verified as the owner.
- When: The owner submits kind article, bookmark, or page with an empty title. A title of surrounding whitespace only is empty.
- Then: The host creates no entry and no edges. The response lets the owner distinguish that the refusal is the missing title.

Scenario: When a bookmark has no external URL, the host stores nothing

- Given: The request is verified as the owner.
- When: The owner submits kind bookmark, a title, and a body, and does not submit an external URL.
- Then: The host creates no entry and no edges. The response lets the owner distinguish that the refusal is the missing external URL.

Scenario: When a note has no title, the host stores an entry whose only public URL is the canonical URL

- Given: The request is verified as the owner.
- When: The owner submits kind note, an empty title, a body, and a visibility.
- Then: The host stores the entry. The only URL an unauthenticated reader can open is the canonical URL. This note is not the resolution target of a title reference from another body.

### Update an entry

As the owner, I want to update the body, title, kind, and visibility of the same entry so that the canonical URL stays, the content is replaced, and links in the body remain as edges.

**Acceptance criteria:**

Scenario: When a later write commits, its fields replace the entry

- Given: One entry exists. Two owner writes commit to that entry in order.
- When: The later write submits kind, title, body, visibility, and external URL.
- Then: Those five fields become the later write's values. The host does not merge them with the earlier write. The immutable ID and canonical URL stay. This write does not remove a Cosense page ID.

Scenario: When an update fails validation, the previous body and edges remain

- Given: An entry and the edges made from its body are committed.
- When: The owner submits an update that changes the kind to one that requires a title, with an empty title.
- Then: The entry's body, title, kind, visibility, and edges stay as they were before the update.

Scenario: When a public write has an empty body, the host stores nothing

- Given: The request is verified as the owner.
- When: The owner submits visibility public and an empty body for an article, a note, or a page.
- Then: A create does not make an entry. An update leaves the previous body and edges. The response is not an authentication failure. A bookmark is not this refusal.

Scenario: When a draft write has an empty body, the host stores the empty string

- Given: The request is verified as the owner.
- When: The owner submits visibility draft and an empty body.
- Then: The host stores the body as the empty string. A change from public to draft also stores the empty string.

Scenario: When the body contains a page reference, the entry and the edge commit together

- Given: A public entry has the current title `Luma AI`.
- When: The owner saves another entry whose body contains `[Luma AI]` outside a code block.
- Then: The new body and an edge with the source immutable ID, the written title `Luma AI`, and the target immutable ID are readable together. A reader cannot see only the new body, or only the new edge.

Scenario: When brackets are an external URL or decoration, the host stores no edge

- Given: The request is verified as the owner.
- When: The owner saves a body that contains `[https://example.com]`, `[GitHub.icon]`, and `[*強調]`.
- Then: The host stores the entry. It creates no edges from those brackets. The line text remains.

Scenario: When the title changes, the canonical URL stays and the old path redirects

- Given: A public entry has a view path and a canonical URL for its immutable ID.
- When: The owner updates it to a new title that does not collide.
- Then: The canonical URL stays. The old title remains as a past title. The old title's path redirects with 301 to the new view path. Bodies of other entries, and the title strings stored on their edges, stay unchanged.

Scenario: When view paths collide, both entries are public only at their canonical URLs

- Given: A public entry titled `A B` has a view path.
- When: The owner saves a public entry titled `A_B`.
- Then: Neither entry receives a view path. Both are read at their canonical URLs. The path that `A B` had redirects with 301 to that entry's canonical URL.

### Open the saved page

As the owner, I want a successful save from the create screen or the edit screen to open that entry's page, so that I see the page I just wrote.

**Acceptance criteria:**

Scenario: When a public save has a view path, the response opens that path

- Given: The request is verified as the owner. One public article, bookmark, or page has a view path.
- When: The owner saves it from GET `/edit/{id}` and the save succeeds.
- Then: The response redirects with 302 to that view path. The path segment is percent-encoded. The response does not stay on GET `/edit/{id}`.

Scenario: When a public save has no view path, the response opens the canonical URL

- Given: The request is verified as the owner. The saved entry is public and has no view path. A public note is this case.
- When: The owner saves that entry from the note field, from GET `/new`, or from GET `/edit/{id}`.
- Then: The response redirects with 302 to GET `/e/{id}`. A note does not open GET `/?posted={id}`.

Scenario: When a draft save succeeds, the owner opens the canonical URL

- Given: The request is verified as the owner.
- When: The owner saves a new article or bookmark, or saves an existing article or bookmark as draft.
- Then: The response redirects with 302 to GET `/e/{id}`. The owner sees the body there and can tell that the entry is a draft. An unverified request for that URL matches a missing entry. The view path does not return the draft body.

Scenario: When the save is refused, the response does not open the entry page

- Given: The request is verified as the owner.
- When: The owner submits a save that this feature refuses.
- Then: The host does not apply that save. The response does not redirect to the entry page.

### See saved articles on the edit screen

As the owner, I want the logged-in edit screen to list draft articles too, so that I can open an unpublished article and save a new visibility.

**Acceptance criteria:**

Scenario: The edit screen lists draft articles too

- Given: The request is verified as the owner. One article is draft and another is public. One note exists.
- When: The owner opens GET `/edit`.
- Then: Both articles appear, newest `createdAt` first. The same timestamp is broken by descending immutable ID. Each item opens that article's edit screen. The note is not in this list. This response does not include the article create form or the bookmark create form. The unauthenticated home page does not include the draft body.

### Look at the edit screen on the local dev server

As the owner, I want GET `/edit` on the local dev server to open without Cloudflare Access, so that I can look at the screen. Writes stay refused.

**Acceptance criteria:**

Scenario: The local dev server shows the edit screen and still refuses a write

- Given: The process is the local dev server. Access is not in front of it. The request has no JWT. One draft article is stored.
- When: The owner opens GET `/edit`.
- Then: The response is the edit screen and includes that draft. GET `/edit/*`, GET `/new`, and GET `/login` on that process also open. POST `/edit`, POST `/edit/*`, and POST `/new` return 404 and store nothing. Preview and the deployed Worker return 404 for those requests when Access cannot verify the owner.

### Sign in at `/login`

As the owner, I want GET `/login` to be the Cloudflare Access login, so that I can open the edit screen and the create screen after Access verifies me.

**Acceptance criteria:**

Scenario: Navigating to `/login` asks Access to verify the owner

- Given: The request is not verified as the owner. Access is in front of GET `/login`.
- When: The owner opens GET `/login`.
- Then: Access asks the owner to authenticate. The Worker does not return the edit screen or a draft body.

Scenario: After Access verifies the owner, GET `/login` returns the login page

- Given: The request is verified as the owner.
- When: The owner opens GET `/login`.
- Then: The response is 200 HTML. It links to `/edit` and `/new`. It does not include a draft body.

Scenario: An unverified edit or create request is 404

- Given: The request is not verified as the owner. The process is not the local dev server's GET exception for looking.
- When: The caller requests `/edit`, `/edit/*`, `/new`, or `/new/*`.
- Then: The response is 404. It does not include a draft body. Nothing is stored.

Scenario: The shared header links to login

- Given: The response is an HTML page from this host.
- When: The caller reads the header.
- Then: The header links to GET `/login`. The link text is ログイン. The link is present whether or not the request is verified as the owner. On GET `/login`, that link is the current page.

### Post a note from the home page

As the owner, I want a note field on the home page, under the navigation, so that a body becomes a public note with no title and I can see its canonical URL. The field is absent unless the request is verified as the owner. The article list and the notes list stay on the edit screen. The article draft form is on GET `/new`.

**Acceptance criteria:**

Scenario: An unverified home page omits the note field

- Given: The request is not verified as the owner. One deliverable entry exists.
- When: The caller opens GET `/`.
- Then: The response is 200 and lists that deliverable entry. The note field is absent. The response does not include a draft body.

Scenario: When the note field has a body, the host stores a public note and shows the canonical URL

- Given: The request is verified as the owner. GET `/` shows the note field under the navigation. GET `/edit` shows the article list and does not show the article create form or the note field. GET `/new` includes the note create form on the note tab. The first response shows the article create form and hides that note form until the owner chooses the tab.
- When: The owner submits a body from the note field and does not submit a title.
- Then: One entry is stored with kind note, an empty title, the submitted body, and visibility public. It has no view path. No article is created. The response redirects with 302 to GET `/e/{id}` of that note. The article list does not include this note. The notes list does. An unauthenticated request for the canonical URL returns the body. An unverified GET `/` does not show the note field.

Scenario: When the note field body is empty, the host stores nothing and shows the refusal

- Given: The request is verified as the owner.
- When: The owner submits an empty body from the note field and does not attach an image.
- Then: The host stores no entry. The response lets the owner distinguish that the refusal is the empty body. This is not an authentication failure. A body of only whitespace is not empty.

Scenario: When the owner uses the article form, the host still creates a draft article

- Given: The request is verified as the owner.
- When: The owner submits a title and body from the article create form.
- Then: One entry is stored with kind article and visibility draft. No note is created. The response redirects with 302 to GET `/e/{id}` of that article. It does not stay on the create form.

### Attach one image to a note

As the owner, I want to attach one image from the home note field, with a control or by pasting, and to write alternative text for it, so that the public note shows that image with the text I typed. A second acceptable image replaces the first before I submit and keeps the alternative text already typed. An image without alternative text is not stored. The reply field does not attach an image.

**Acceptance criteria:**

Scenario: When the owner chooses or pastes an image, the field shows it before submit

- Given: The request is verified as the owner. The home page shows the note field.
- When: The owner chooses one JPEG, PNG, GIF, or WebP file from the attach control, or pastes one image into the field.
- Then: The field shows that image. The body text is unchanged. The host has not stored a note yet.

Scenario: When another acceptable image is chosen or pasted, it replaces the first

- Given: The note field already shows one image. The owner has not submitted.
- When: The owner chooses or pastes another acceptable image.
- Then: The field shows only the new image. Alternative text already typed stays in the field.

Scenario: When the owner removes the image, the submit includes no image

- Given: The note field shows one image and a body.
- When: The owner removes the image and submits.
- Then: The stored note has that body and no image.

Scenario: When the owner submits a body and one image, the public note shows both

- Given: The request is verified as the owner.
- When: The owner submits a body, one acceptable image, and alternative text from the note field.
- Then: One public note is stored. The body is the submitted text and does not gain an image URL or the alternative text. The title is empty. The home page and the canonical page show that body and one image under it. The image alt is that text. No article is created. [Public reading](../public-reading/requirements.md) returns the image bytes.

Scenario: When the owner submits only an image, the host stores a public note

- Given: The request is verified as the owner.
- When: The owner submits an empty body, one acceptable image, and alternative text.
- Then: One public note is stored with an empty body and that image. The public pages show the image with that text as its alt. This is not the empty-body refusal.

Scenario: When an image has no alternative text, the host stores nothing

- Given: The request is verified as the owner. The note field shows one acceptable image.
- When: The owner submits that image with no alternative text, or with only whitespace.
- Then: The host stores no entry and does not keep the image bytes. The owner can tell this refusal from the empty-body refusal.

Scenario: When the alternative text is longer than 1500 Unicode scalar values, the host stores nothing

- Given: The request is verified as the owner. The note field shows one acceptable image.
- When: The owner submits alternative text longer than 1500 Unicode scalar values.
- Then: The host stores no entry. Surrounding whitespace is not part of that count. The owner can tell this refusal from a missing alternative text.

Scenario: When the file is not an accepted image or is larger than 8 MiB, the host stores nothing

- Given: The request is verified as the owner. The field may already show an acceptable image.
- When: The owner submits a file that is not JPEG, PNG, GIF, or WebP, or a file larger than 8 MiB.
- Then: The host stores no entry. The owner can tell this refusal from the empty-body refusal. The file does not replace an image the field already shows.

Scenario: When the request carries more than one image, the host stores nothing

- Given: The request is verified as the owner.
- When: The note field submits more than one image.
- Then: The host stores no entry. The owner can tell that only one image is allowed.

Scenario: When the image bytes cannot be stored, the host stores no note

- Given: The owner submits one acceptable image.
- When: The byte store refuses the write.
- Then: The host stores no entry. The response is not a successful save and is not the empty-body refusal.

Scenario: When a note with an image is deleted, the image is no longer public

- Given: A public note has one image.
- When: The owner deletes that note.
- Then: A reader cannot retrieve those image bytes. The canonical URL follows the delete rules for a note.

Scenario: The reply field does not attach an image

- Given: The request is verified as the owner. A public note is open.
- When: The owner reads the reply field and submits a reply body.
- Then: The reply field has no image control. The stored reply has no image.

Scenario: The edit screen shows a note image

- Given: The request is verified as the owner. One note has an image and another does not.
- When: The owner opens GET `/edit`.
- Then: The note with an image shows that image and its alternative text. The other note does not. Neither item opens the article edit screen.

### Attach images to an article or a bookmark

As the owner, I want to attach many images to an article or a bookmark, and to place any of them in the Markdown body. A public article shows an image only where that Markdown places it. A public bookmark shows the images under the body and also where I placed them. Alternative text may be left empty. A note stays one image, and that text stays required.

**Acceptance criteria:**

Scenario: When the owner chooses or pastes images, the form shows them before submit

- Given: The request is verified as the owner. The article or bookmark form is open.
- When: The owner chooses more than one JPEG, PNG, GIF, or WebP file, or pastes image files into the form.
- Then: The form shows those images in that order. The body text is unchanged. The host has not stored the entry yet. A paste that contains an image does not insert the clipboard text.

Scenario: When alternative text is empty, the host stores the image

- Given: The request is verified as the owner. The form shows an acceptable image.
- When: The owner submits that image with no alternative text, or with only whitespace.
- Then: The image is stored. The stored text is empty. The public image alt is empty. This is not the note rule that refuses a missing alternative text.

Scenario: When alternative text is longer than 1500 scalar values, the host stores no change

- Given: The request is verified as the owner. The form shows an acceptable image.
- When: The owner submits alternative text longer than 1500 Unicode scalar values.
- Then: The host does not store that submit. An existing entry is left as it was. The owner can tell this refusal from an empty body.

Scenario: When the file is not an accepted image or is larger than 8 MiB, it is not added

- Given: The form may already show acceptable images.
- When: The owner chooses or pastes a file that is not JPEG, PNG, GIF, or WebP, or a file larger than 8 MiB.
- Then: That file is not shown. Images already shown stay. The host stores nothing from that file.

Scenario: When the owner submits, a bookmark lists the images under the body and an article does not

- Given: The request is verified as the owner.
- When: The owner submits an article or a bookmark with several acceptable images.
- Then: The entry stores those images in the submitted order. The body is the submitted text. The host does not add an image URL or alternative text unless the owner placed that Markdown. A public bookmark lists every stored image under that body. A public article does not list stored images under the body. A draft image is not returned on the public image URL.

Scenario: When the owner places an image in the body, a bookmark still lists it and an article does not

- Given: The form shows an image.
- When: The owner uses the control labeled `本文に入れる`.
- Then: The body gains a Markdown image at the cursor. The label is the alternative text then in the field, and `]` and line breaks in that copy become spaces. The stored alternative text is unchanged. A public article shows that image only in the body. A public bookmark shows that image in the body and again under the body.

Scenario: When the owner removes an image, the body is not rewritten

- Given: The form shows an image, and the body may already contain its Markdown.
- When: The owner removes the image and submits.
- Then: That image is not stored. The body remains the text the owner left in the field.

Scenario: Deleting a bookmark removes its images

- Given: A bookmark has images.
- When: The owner deletes that bookmark.
- Then: A reader cannot retrieve those image bytes.

### See and delete saved notes on the edit screen

As the owner, I want the edit screen to list saved notes so that I can check the body I posted and delete a note without opening an edit screen.

**Acceptance criteria:**

Scenario: The edit screen lists notes apart from articles

- Given: The request is verified as the owner. One note is draft and another is public. One article exists.
- When: The owner opens GET `/edit`.
- Then: Both notes appear, newest `createdAt` first. The same timestamp is broken by descending immutable ID. Each item shows the body and the visibility. Neither item opens the article edit screen. The article list does not include the notes.

Scenario: When the owner deletes an undelivered note from the edit screen, it leaves the list and the canonical URL is 404

- Given: The request is verified as the owner. One note exists and it has no delivered record. One article exists.
- When: The owner submits deletion for that note.
- Then: The note disappears from the edit list. The unauthenticated canonical URL is 404 and does not return the deleted body. The article remains.

Scenario: When the owner deletes a delivered note from the edit screen, the canonical URL is 410

- Given: The request is verified as the owner. One note exists and it has a delivered record.
- When: The owner submits deletion for that note.
- Then: The note disappears from the edit list. The unauthenticated canonical URL is 410 and does not return the deleted body. The delivered record remains.

Scenario: When the note delete is sent an article ID, the article remains

- Given: The request is verified as the owner. One article exists.
- When: The owner submits the note delete with that article's ID.
- Then: The article remains. The response is not a successful note deletion.

### Reply to a note from its canonical page

As the owner, I want a reply field on each note shown at a note's canonical URL, so that a body becomes a public note linked to the note I chose and I can read the connected notes on that page. The field is absent unless the request is verified as the owner.

**Acceptance criteria:**

Scenario: An unverified note page omits the reply field

- Given: The request is not verified as the owner. One public note exists.
- When: The caller opens that note's canonical URL.
- Then: The response is 200 and includes the body. The reply field is absent.

Scenario: When the owner replies to a note, the host stores a public note in that thread

- Given: The request is verified as the owner. Public note A does not reply to another note. The canonical page of A shows a reply field on A.
- When: The owner submits a body from that field.
- Then: One entry is stored with kind note, an empty title, the submitted body, and visibility public. It has no view path and no publishedAt. It replies to A and belongs to A's thread. It is not deliverable. No article is created. The response shows the thread, including the new body, in created-time order, and shows that the new note replies to A. The notes list includes it. GET `/` does not. An unauthenticated request for the new note's canonical URL returns the thread.

Scenario: When the owner replies to a reply, the new note stays in the same thread

- Given: The request is verified as the owner. Public note A does not reply to another note. Public note B replies to A.
- When: The owner submits a body from the reply field on B.
- Then: One public note is stored. It replies to B and belongs to A's thread. It is not deliverable. The canonical page of A, of B, and of the new note each shows the three bodies in created-time order. The new note shows that it replies to B.

Scenario: When the reply body is empty, the host stores nothing and shows the refusal

- Given: The request is verified as the owner. Public note A exists.
- When: The owner submits an empty body from the reply field on A.
- Then: The host stores no entry. The response lets the owner distinguish that the refusal is the empty body. This is not an authentication failure. A body of only whitespace is not empty.

Scenario: When the reply target is not a public note, the host stores nothing

- Given: The request is verified as the owner. One public article exists. One draft note exists.
- When: The owner submits a body as a reply to the public article, to the draft note, and to an id that is not stored.
- Then: The host stores no entry. The article and the draft note remain. The response is not an authentication failure.

Scenario: When the owner deletes one note in a thread, the other notes remain

- Given: The request is verified as the owner. Public note A does not reply to another note. Public note B replies to A. Public note C replies to B. None of them has a delivered record.
- When: The owner deletes B.
- Then: B disappears from the notes list. The canonical URL of B is 404 and does not return B's body. A and C remain. The canonical page of C includes the bodies of A and C, does not include B's body, and shows no reply target on C.

### Open the edit screen from a public article, bookmark, or page

As the owner, I want an edit link at the bottom of a public article, bookmark, or page, on its view path and on its canonical page, so that I can open that entry's edit screen. The link is absent unless the request is verified as the owner. A note does not show it. GET `/edit` does not list pages.

**Acceptance criteria:**

Scenario: An unverified article page omits the edit link

- Given: The request is not verified as the owner. One public article has a view path.
- When: The caller opens that view path and the canonical URL.
- Then: Each response is 200 and includes the body. The edit link is absent.

Scenario: The owner opens the edit screen from the public page

- Given: The request is verified as the owner. One public article, one public bookmark, and one public page each have a view path.
- When: The owner opens each view path and each canonical URL.
- Then: Each response is 200 and includes the body. After the entry, a link reads `edit` and opens GET `/edit/{id}` for that entry. The stored body is unchanged.

Scenario: A note omits the edit link

- Given: The request is verified as the owner. One public note exists.
- When: The owner opens the note's canonical URL.
- Then: That response does not include the edit link.

Scenario: The local dev server includes the edit link

- Given: The process is the local dev server. Access is not in front of it. The dev catalog includes a public article and a public page.
- When: The owner opens that article's view path and that page's view path.
- Then: Both responses include the edit link.

### Save a page from its edit screen

As the owner, I want the edit screen opened from a public page to replace that page's title and body, so that a Cosense page can be edited on this host. Kind stays page. Visibility stays as stored. The page does not become deliverable.

**Acceptance criteria:**

Scenario: The owner saves a new title and body

- Given: The request is verified as the owner. One public page has a Cosense page ID, a last imported body, and a source updated time. `publishedAt` is absent.
- When: The owner opens GET `/edit/{id}` and submits a new title and a non-empty body.
- Then: Kind stays page. Visibility stays public. `publishedAt` stays absent. The Cosense page ID, the last imported body, and the source updated time stay. The title and body are the submitted values. The view path follows the same title rule as an article update. The response redirects with 302 to that view path when one exists, and otherwise to GET `/e/{id}`. GET `/edit` still does not list the page. A later import that sees a different body reports that page ID as a local edit and does not replace the body. That report is defined by Cosense import.

Scenario: An empty page body is refused

- Given: The request is verified as the owner. One public page has a body.
- When: The owner submits an empty body from GET `/edit/{id}`.
- Then: The previous title and body remain. The response lets the owner distinguish the empty body. A body of only whitespace is stored.

Scenario: The page form has no visibility control

- Given: The request is verified as the owner. One public page exists.
- When: The owner opens GET `/edit/{id}`.
- Then: The form includes the title, the body, and the same image controls as an article. It does not include a visibility control. A submitted visibility value does not change the stored visibility. Images follow the article image rule. Public HTML for the page does not list those images under the body.

Scenario: A note ID does not open the page form

- Given: The request is verified as the owner. One note exists.
- When: The owner opens GET `/edit/{id}` for that note, and for an id that is not stored.
- Then: Each response is 404. Nothing is stored.

### Save a bookmark on the edit screen

As the owner, I want the edit screen to create, list, update, and delete bookmarks so that an external URL and a comment are stored on this host apart from articles and notes.

**Acceptance criteria:**

Scenario: When the bookmark form has a title and an external URL, the host stores a draft bookmark

- Given: The request is verified as the owner.
- When: The owner submits a title, an external URL, and a body from the bookmark create form.
- Then: One entry is stored with kind bookmark, visibility draft, the submitted title, the submitted body, and that external URL. The body does not gain the URL. No article and no note are created. The bookmark is not in the article list or the notes list. It is in the bookmark list. The response redirects with 302 to GET `/e/{id}`.

Scenario: When the bookmark form has an empty title, the host stores nothing

- Given: The request is verified as the owner.
- When: The owner submits kind bookmark from the bookmark create form with an empty title. A title of surrounding whitespace only is empty.
- Then: The host stores no entry. The response lets the owner distinguish that the refusal is the missing title.

Scenario: When the bookmark form has no external URL, the host stores nothing

- Given: The request is verified as the owner.
- When: The owner submits a title and a body from the bookmark create form and does not submit an external URL. A URL of surrounding whitespace only is missing.
- Then: The host stores no entry. The response lets the owner distinguish that the refusal is the missing external URL.

Scenario: The new screen shows one create form at a time

- Given: The request is verified as the owner.
- When: The owner opens GET `/new`.
- Then: The article create form is shown. The bookmark create form and the note create form are in the same response and are not shown. The notes list, the article list, and the bookmark list are not in this response. Choosing the bookmark tab shows the bookmark create form and hides the other two forms. Choosing the note tab shows the note create form and hides the other two. Choosing the article tab shows the article create form and hides the other two. Choosing a tab stores nothing. Text already typed in any form stays. The note create form posts to POST `/edit?note` and uses the same body and image rules as the home note field. The article Title input is empty.

Scenario: A missing title opens the new screen with that title filled in

- Given: The request is verified as the owner. No public entry has the title `ぼくのなつやすみ`.
- When: The owner opens that title path, then follows the link whose visible text is `作成`.
- Then: The title path includes that link. The link opens GET `/new?title=` plus the title percent-encoded. The article create form is shown. Its Title input contains `ぼくのなつやすみ`. The bookmark Title input is empty. The host stores no entry. An unverified request for the title path omits the link. On the local dev server the link is included.

Scenario: The edit screen lists bookmarks apart from articles and notes

- Given: The request is verified as the owner. One bookmark is draft and another is public. One article and one note exist.
- When: The owner opens GET `/edit`.
- Then: Both bookmarks appear, newest `createdAt` first. The same timestamp is broken by descending immutable ID. Each item shows the title, the external URL, and the visibility, and opens that bookmark's edit screen. The article list and the notes list do not include the bookmarks.

Scenario: When the owner updates a bookmark, the host replaces the title, body, visibility, and external URL

- Given: The request is verified as the owner. One bookmark exists.
- When: The owner opens GET `/edit/{id}` for that bookmark and submits a new title, body, visibility, and external URL.
- Then: Those four fields become the submitted values. The kind stays bookmark. The body does not gain the URL. The immutable ID stays. When the save succeeds, the response redirects with 302 to the view path if the bookmark is public and has one, and otherwise to GET `/e/{id}`.

Scenario: When a public bookmark has an empty comment, the host stores it

- Given: The request is verified as the owner. One bookmark has a title and an external URL.
- When: The owner submits visibility public and an empty body for that bookmark, with the title and the external URL.
- Then: The bookmark is public. The body is the empty string. The external URL stays apart from the body. The response is not a refusal for an empty body.

Scenario: When the owner deletes an undelivered bookmark from the edit screen, the canonical URL is 404

- Given: The request is verified as the owner. One bookmark exists and it has no delivered record. One article and one note exist.
- When: The owner submits deletion for that bookmark.
- Then: The bookmark disappears from the edit list. The unauthenticated canonical URL is 404 and does not return the deleted body. The article and the note remain.

Scenario: When the owner deletes a delivered bookmark from the edit screen, the canonical URL is 410

- Given: The request is verified as the owner. One bookmark exists and it has a delivered record.
- When: The owner submits deletion for that bookmark.
- Then: The bookmark disappears from the edit list. The unauthenticated canonical URL is 410 and does not return the deleted body. The delivered record remains.

Scenario: When the bookmark delete is sent another kind's ID, that entry remains

- Given: The request is verified as the owner. One article and one note exist.
- When: The owner submits the bookmark delete with the article's ID, and again with the note's ID.
- Then: Both entries remain. Neither response is a successful bookmark deletion.

### Change visibility

As the owner, I want to switch between draft and public so that unfinished text leaves the public site and only published articles, notes, and bookmarks can become deliverable.

**Acceptance criteria:**

Scenario: When the owner sets draft, the body disappears from unauthenticated responses

- Given: An entry exists whose body the owner can read.
- When: The owner saves visibility draft.
- Then: The owner's get returns the body. The unauthenticated canonical URL responds as it would if that entry did not exist. The draft body does not appear in feeds, an empty page, or delivery.

Scenario: When the owner publishes an article, note, or bookmark, the host records when it became deliverable

- Given: The request is verified as the owner. The entry's kind is article, note, or bookmark.
- When: The owner saves visibility public.
- Then: An unauthenticated reader can read the body. publishedAt is the time this save made the entry deliverable. If the entry was already deliverable, publishedAt stays unchanged.

Scenario: When the owner publishes a page, the body is public and the entry is not deliverable

- Given: An entry has kind page.
- When: The owner saves visibility public.
- Then: An unauthenticated reader can read the body. The entry is not deliverable. It has no publishedAt. It is not part of the human-readable feeds.

Scenario: When the entry stops being deliverable, the delivered mark remains

- Given: The entry is deliverable, and the ActivityPub feature has recorded it as delivered.
- When: The owner saves visibility draft, or changes the kind to page.
- Then: The entry is no longer deliverable. The immutable ID, canonical URL, and delivered record remain. This feature does not send a Delete activity.

### Delete an entry

As the owner, I want to delete an entry so that the body leaves the public site and a URL that was once delivered is visibly removed.

**Acceptance criteria:**

Scenario: When the owner deletes an entry that was never delivered, the canonical URL returns 404

- Given: An entry exists and has no delivered record. The request is verified as the owner.
- When: The owner deletes that entry.
- Then: The owner's get and list do not return it as an editable entry. The public response for the canonical URL is 404. The response does not include the deleted body.

Scenario: When the owner deletes an entry that was delivered, the canonical URL returns 410

- Given: The ActivityPub feature has recorded that entry as delivered. The request is verified as the owner.
- When: The owner deletes that entry.
- Then: The public response for the canonical URL is 410. A response that asks for Activity Streams returns a Tombstone. The response does not include the deleted body. The immutable ID is not reused for another entry.

Scenario: When an unverified request deletes an entry, the entry remains

- Given: An entry exists. The request is not verified as the owner.
- When: That request submits a delete.
- Then: A request under `/edit` or `/new` returns 404. A request that is not on those paths returns 401. The entry, its edges, and its visibility stay unchanged.

### Issue a CLI token and write with it

As the owner, I want to write with a CLI token that does not go through the browser login so that a program can create, update, publish, delete, get, and list as the owner.

**Acceptance criteria:**

Scenario: When the owner issues a token from the browser session, the host returns the token once

- Given: A browser request is verified as the owner. No CLI token exists yet.
- When: The owner asks to issue a token.
- Then: That response includes the token once. Later gets and lists do not return the token value. The host stores only a hash.

Scenario: When the owner reissues a token, the previous token stops working

- Given: One valid CLI token exists. A request is verified as the owner.
- When: The owner reissues the token.
- Then: The host returns the new token once. A write that presents the previous token receives 401, and the entry stays unchanged. Only one token is valid.

Scenario: When the CLI creates an entry with a valid token, the result matches the browser

- Given: A valid CLI token exists. The request has not gone through the browser login flow.
- When: The CLI submits a create with that token and the required fields.
- Then: The host creates the same entry it would create if the browser owner session submitted the same fields.

## KPIs

### No numeric target

The parent product sets no percentage target for availability or delivery success. This feature is accepted or rejected by the acceptance criteria above.

- **Current value:** None, because the feature is new
- **Target value:** None
- **Measurement method:** None
- **Measurement period:** None

## Functional requirements

### Writes

**Overview:** The browser and the CLI use the same write rules. One write submits kind, title, body, and visibility. A bookmark write also submits an external URL. The write that commits later becomes the new state of these fields.

**Input:** A request verified as the owner. The fields are kind, title, body, visibility, and a bookmark's external URL. The CLI accepts the body from a file for create and update. Create, update, publish, delete, get, and list stay available on that same CLI. The fields stay the ones in this section.

**Output:** The committed entry, or the reason for refusal. On refusal, the entry and its edges stay unchanged.

#### Applicable conditions

##### Replacing fields

Create and update submit kind, title, body, and visibility together. A bookmark update also submits the external URL. After normalization, the submitted fields become the entry's current values. A field replacement does not remove the immutable ID, created time, past titles, Cosense page ID, or delivered record. The host adds the old title to the past titles only when the normalized title changes.

The created time is when the create commits. The updated time is when a later write commits.

##### Kinds

The kinds are article, note, bookmark, and page. The host does not classify by body length or by whether the body contains a URL. Any other kind is refused and stored nowhere.

An article is a blog post. A note is a short post. A bookmark is an external URL plus a comment. A page is an imported page or a page used as a link target. The owner can create a page without going through import.

##### Titles

Before comparison, the host removes whitespace at both ends and collapses consecutive whitespace into one space. Comparison is case-sensitive. After normalization, an entry has one current title.

Article, bookmark, and page require a title. A note can be stored with an empty title. A note with an empty title is not the target of title resolution.

##### External URL

A bookmark's external URL is required and is separate from the body. The host stores the body text the owner submitted and does not insert the URL into the body. Article, note, and page do not require an external URL. If a write of those kinds includes no URL, the external URL becomes empty.

##### Visibility

Visibility is draft or public. Any other value is refused and stored nowhere.

A deliverable entry has kind article, note, or bookmark, and visibility public. A note that replies to another note is not deliverable. That note is public at its canonical URL and has no publishedAt. A page is not deliverable even when public. A draft is not deliverable.

publishedAt is the time the entry became deliverable. An entry that is not deliverable has no publishedAt. An update of an entry that is already deliverable does not change publishedAt. When an entry stops being deliverable and later becomes deliverable again, publishedAt becomes that later time.

##### View paths

The canonical URL is `https://weblog.yamanoku.net/e/{id}`. The ActivityPub object ID and the human-readable feed item ID use this URL. Feed contents and sending activities are decided by their own features.

The view path is `/{title}`. Spaces in the title become `_`, and the result is percent-encoded. A note with no title has no view path.

When a title that already contains `_` and a title whose spaces became `_` would share a path, that path is the view path of neither entry. A colliding page is public only at its canonical URL. A previous path dropped because of a collision redirects with 301 to that entry's canonical URL.

After a rename, the old title's path redirects with 301 to the current view path. When there is no current view path, it redirects with 301 to the canonical URL.

##### Body and edges

The entry and the edges made from its body commit in the same update. A reader cannot see only one of them in the new state. When the store cannot commit, both stay as they were.

An empty body is the empty string. A body that contains only whitespace is not empty.

A write with visibility public and an empty body is not stored when the kind is article, note, or page. A create does not make an entry. An update leaves the previous body and edges. A change from draft to public is also not stored when the body is empty. This refusal is separate from an authentication failure. A bookmark may be public with an empty comment. The external URL stays required and stays apart from the body.

A write with visibility draft stores an empty body as the empty string. A change from public to draft also stores the empty string when the body is empty.

An edge has the source immutable ID, the title written in the body, and the target immutable ID. An edge with no target remains. The host does not store the extraction syntax tree. It stores the line text and the edges produced by the following rules.

This write does not change another entry's body. The title string stored on an edge changes only when the owner rewrites the body of that edge's source. A rename alone does not change the title strings on other entries' edges.

Link extraction applies these rules to the stored body.

- The inside of a fenced code block is not an edge.
- The inside of a pipe table is not an edge.
- A `[label](URL)` whose URL starts with `http://` or `https://` is not an edge.
- A URL that starts with `/` and does not start with `//` is an edge. The edge title is the label before the parentheses, normalized the same way as a title. When that label ends with `#` and a 24-hex line id, the edge title omits that `#` and the line id. Spaces in the label are not turned back from `_` in the path.
- Any other bracket, `#`, icon, or formula is not an edge.

An unauthenticated resolution target is only a public entry whose current title matches. When no entry uses that string as its current title, and a public entry records it as a past title, the target is that entry. A draft resolves only in the owner's view. An edge with no matching public entry remains. Reading does not create an entry.

##### Get and list

The owner's get-one and list include draft and public entries of all four kinds. An unauthenticated response does not include a draft body. The public-reading feature decides the format of the unauthenticated feeds and empty pages.

GET `/`, when the request is verified as the owner, shows the note field under the navigation. An unverified GET `/` omits that field and does not include a draft body. An unverified request for `/edit`, `/edit/*`, `/new`, or `/new/*` returns 404 and does not include a draft body. GET `/login` is the Cloudflare Access login. When that request is verified as the owner, it returns 200 HTML with links to `/edit` and `/new`, and no draft body. GET `/edit`, when the request is verified as the owner, returns a list of stored articles, a separate list of stored notes, and a separate list of stored bookmarks. It does not return the article create form, the bookmark create form, or the note field. GET `/new`, when the request is verified as the owner, returns the article create form, the bookmark create form, and the note create form. The three create forms share one tab list. The first response shows the article create form. The other two stay in the response and are hidden until the owner chooses their tab. Choosing a tab stores nothing and keeps text already typed in any form. GET `/new` does not return those lists. The article form posts to POST `/edit`. The bookmark form posts to POST `/edit?bookmark`. The note form posts to POST `/edit?note` and uses the same body and image rules as the home note field. A successful note save redirects with 302 to GET `/e/{id}`. A successful save of an article, bookmark, or page redirects with 302 to the view path when the saved entry is public and has one, and otherwise to GET `/e/{id}`. A refused save does not redirect. Those lists include draft and public. The article list does not include notes, bookmarks, or pages. Each article opens that article's edit screen. Each note shows its body, its visibility, and its image when it has one, and does not open the article edit screen. Each bookmark shows its title, external URL, and visibility, and opens that bookmark's edit screen. The article form, the bookmark form, and GET `/edit/{id}` accept many images for that entry. Each image is JPEG, PNG, GIF, or WebP and at most 8 MiB. Alternative text is optional, surrounding whitespace is removed, and more than 1500 Unicode scalar values stores no change. Empty text is stored as empty. A public bookmark lists the images under the Markdown body. A public article does not list them there. A control labeled `本文に入れる` copies one image into the body as Markdown. Removing an image does not rewrite the body. A draft image is not on the public image URL. The CLI does not send these images. A reply does not get them. A page gets them on GET `/edit/{id}`, with the same image rules as an article. A public page does not list them under the body. The order is newest `createdAt` first, then descending immutable ID. An unauthenticated response does not return these lists. The local dev server is the exception: its GET `/edit`, GET `/edit/*`, and GET `/new` return the screens, including drafts, so the owner can look. POST from that process stays 401. Preview and the deployed Worker are not this exception. The note field does not submit a title. When it has a body or one image, the host stores kind note, an empty title, and visibility public. The body stays the submitted text. The response shows that the save succeeded and shows the canonical URL. An empty body with no image stores nothing. One image is at most 8 MiB and is JPEG, PNG, GIF, or WebP. The owner writes alternative text for that image. Without that text, or when the text is only whitespace, the host stores nothing. The stored text is at most 1500 Unicode scalar values, after surrounding whitespace is removed. Public pages use that text as the image alt. Deleting a note removes that note only, and a reader can no longer retrieve its image bytes. An article ID does not delete the article. The bookmark form stores kind bookmark and visibility draft. The external URL stays apart from the body. An empty title or a missing external URL stores nothing. Deleting a bookmark removes that bookmark only. An article ID or a note ID does not delete that entry. GET `/e/{id}` for a public note shows a reply field on each note in that thread when the request is verified as the owner. An unverified request omits the fields. A reply stores kind note, an empty title, and visibility public. It has no publishedAt and no view path. It records the note it replies to and the note that started the thread. An empty body stores nothing. A target that is not a stored public note stores nothing. The new note appears in the thread and in the notes list. It does not appear on GET `/`. Deleting one note in a thread removes that note only. A verified owner's view path and canonical page for a public article, a public bookmark, or a public page include, after the entry, a link whose visible text is `edit` and whose target is GET `/edit/{id}` for that entry. An unverified request omits the link. A public note omits it. GET `/edit` does not list pages. On the local dev server the link is included for those articles, bookmarks, and pages. When no public entry has the title on GET `/{title}`, a verified owner also sees a link whose visible text is `作成` and whose target is GET `/new?title=` plus that path title percent-encoded. An unverified request omits that link. The host stores no entry. That GET `/new` shows the article create form with its Title input set to the decoded title. The bookmark Title input stays empty. GET `/new` without the query leaves the article Title input empty. The local dev server includes the `作成` link.

##### A store that is past the free allowance

When a store cannot commit because it is past the free allowance, the entry and its edges stay as they were. The app does not move onto a paid plan. The response lets the owner distinguish that the store did not commit. The owner can also distinguish it from an authentication failure.

#### Exceptional behavior

##### An unverified request

A request under `/edit` or `/new` that is not verified as the owner returns 404 and does not change the entry or its edges. A write, delete, or token issuance on another path that is not verified returns 401 and does not change the entry or its edges. A refusal for invalid input is not 401. Design chooses any status code other than 401 for that input refusal, without colliding with 404, 410, or 301.

##### Canonical URL of a deleted entry

A deleted ID with no delivered record returns 404. A deleted ID with a delivered record returns 410. A 410 response that asks for Activity Streams returns a Tombstone. Neither response includes the deleted body. The title path does not resolve as the current title of a public entry. The deleted body does not appear on an empty page.

### CLI token

**Overview:** The owner issues and reissues a CLI token. The CLI does not go through the browser login flow.

**Input:** An issuance request verified as the owner. For a write, a token that was already issued.

**Output:** The token at issuance. No other response includes the token value.

#### Applicable conditions

##### First issuance and reissue

The first token is issued from the browser owner session, because the CLI has no token before that. Reissue is available from the browser owner session or from a valid CLI token. Reissue invalidates the previous token. Only one token is valid.

The host stores only a hash. It returns the token value once, in the issuance response.

#### Exceptional behavior

##### An invalid token

A request that presents an invalid token, or a token invalidated by reissue, returns 401. The entry and its edges stay unchanged.

##### The browser authentication service cannot verify the owner

When the browser authentication service cannot verify the owner, a request under `/edit` or `/new` returns 404 and stores nothing. GET `/login` is the Access login path. A request for `/login` that reaches the Worker without a verified owner returns 401. Verification of an already issued CLI token does not use that service. A missing or invalid CLI token still returns 401.

## Data requirements

### Required data

- **Entry:** Immutable ID, kind, normalized current title, past titles, body line text, visibility, created time, updated time, bookmark external URL, publishedAt, and Cosense page ID. A note that replies to another note also has the id of the note it replies to and the id of the note that started the thread. After deletion, an undelivered entry leaves public get. A delivered deleted ID remains as a 410 without the body.
- **Edge:** Source immutable ID, title written in the body, and target immutable ID. The edges are replaced in the same update that stores the source body. An edge remains when it has no target.
- **CLI token hash:** Used to verify a token the owner issued. The token value is not retained. Reissue invalidates the previous hash.
- **Delivered record:** Shows that the entry was delivered at least once. The ActivityPub feature records it. This feature does not remove that record when visibility or kind changes, or when an undelivered entry is deleted. After deletion of a delivered ID, the record remains so the URL can return 410.
- **Note image:** At most one still image for a note posted from the home field, plus the alternative text for that image. Neither is part of the body text. A reply does not get one from this field. Deleting the note removes it from public read. An article or a bookmark has zero or more images, each with its own id and optional alternative text. Those images are not part of the body unless the owner writes the Markdown. Deleting the bookmark removes them from public read.

### Relationships

An entry has one immutable ID. It has one current title, except a note with an empty title. A past title is a former current title of that entry. An edge belongs to one source entry and points at zero or one target through the title written in the body. A bookmark's external URL is a field separate from that entry's body. A note that replies to another note stores that note's id and the id of the note that started the thread. A note that is not a reply leaves both empty. A note has zero or one image. When it has an image, it stores the alternative text for that image, and that image's id is the note's id. An article or a bookmark has zero or more images. Each of those images has its own id, a position, and alternative text that may be empty. The image belongs to that entry's immutable ID. Deleting one note does not change those two ids on another note. A CLI token hash is the owner's write credential and does not belong to an entry. A delivered record corresponds to one immutable ID.

### Personal information

Browser-authentication identity and the CLI token identify the owner, yamanoku. The purpose is to limit writes to the owner. The identity and the token value do not appear in public responses.

The body, title, bookmark URL, and entry images may name or depict the owner or another person. A public entry, including its images, is readable without authentication. A draft body and a draft image are readable only by the owner. This feature has no procedure for collecting a third party's consent other than the owner's choice of visibility.

The token hash is retained until reissue invalidates it. A deleted ID that was delivered remains, without the body, as a URL remote servers may still hold. There is no retention deadline.

## External service dependencies

- **Cloudflare R2**
  - **Related user stories:** Attach one image to a note, Attach images to an article or a bookmark
  - **Reason for dependency:** The image bytes are not stored in the entry body. [Public reading](../public-reading/requirements.md) returns them.
  - **Contractual and usage decisions:** Use R2 on the same account. This feature does not contract a new paid plan. Storage beyond the free allowance stays outside the zero-yen target, as the parent product states. The note image is not written into the bucket `gyazo-archives`.

- **Cloudflare Access (Zero Trust Free plan)**
  - **Related user stories:** Create an entry, Issue a CLI token and write with it
  - **Reason for dependency:** The browser editing screen verifies the one owner. The product has no signup. The first CLI token is issued from a session that this service has verified.
  - **Contractual and usage decisions:** Use the Free plan. Up to 50 seats have no extra charge, and the only seat used is the owner. Paid add-ons stay off. The app does not move itself onto a paid plan. When this service is removed, the owner decides the three requirements in the open questions below. The CLI token rules stay. Domain registration fees are outside this dependency's cost. A Cloudflare Community explanation dated 2026-10-17 says the Free plan reaches a cap by seat count. Paid add-ons such as Log Explorer are not billed unless the owner explicitly upgrades. A Free organization is not charged when the signup flow asks for payment information. That procedure was updated on 2026-10-12.

## Security considerations

Browser authentication of the owner, the CLI token, and server-to-server HTTP signatures are different credentials. An HTTP signature does not authorize a write. A CLI token does not authorize the sender of an inbox post.

Every write, delete, and token issuance verifies that the request is the owner's. Placing the browser editing screen behind the authentication service is not, by itself, enough to authorize a write.

An unauthenticated response does not return a draft body. An unauthenticated response does not show whether a draft exists. An unverified request for `/edit`, `/edit/*`, `/new`, or `/new/*` returns 404. The local dev server's GET `/edit`, GET `/edit/*`, GET `/new`, and GET `/login` are the exception, and only so the owner can look. A write on that server still returns 404 when Access cannot verify the owner.

The CLI token value and the secrets used to verify browser authentication do not appear in public responses or in the repository. The token hash is the form that may be stored.

A note image is accepted only when its bytes are JPEG, PNG, GIF, or WebP, its size is at most 8 MiB, and it has alternative text of at most 1500 Unicode scalar values. An article or bookmark image uses the same byte rules. Its alternative text may be empty and, when present, is at most 1500 Unicode scalar values. The public image response is not an HTML page. The alternative text is world-readable with that public entry. A draft image is not on that public URL.

## Open questions

Whether these extraction rules match the link range on the Cosense screen is undecided. Until the owner decides, edges are made by the rules above. The owner changes the rules after comparing a fetched body with the screen and judging that they differ. It is not established that they match.

The browser authentication method after Access is removed is undecided. Passkey is only a named candidate and is not adopted. Version 1 keeps Access for the browser. The CLI token rules stay. The owner decides the replacement. Until that decision, the contractual sentence above still stands.

When the owner decides to remove Access, the owner writes these three requirements.

- The first is the means that verifies a browser request is the owner. If passkey is that means, the requirements adopt it at that time.
- The second is how the session that issues the first CLI token is created. Issuing that token from a browser session that has already verified the owner stays required. The new method states how it creates that session.
- The third is whether the login boundary changes. Public reading, the human-readable feeds, and WebFinger stay outside login. The inbox and the CLI path `/entries` stay outside login too. Keeping that boundary is written as unchanged. Changing it names the paths that move.
