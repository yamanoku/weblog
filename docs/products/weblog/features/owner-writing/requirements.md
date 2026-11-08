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

- The format, page size, and presentation of human-readable feeds, the title index, and the HTML of an empty page. The public-reading feature decides those. This feature still forbids putting a draft body on those responses.
- The ActivityPub actor, Follow, signatures, and sending activities. This feature records the state needed to decide delivery. It does not send activities.
- Putting a bookmark's external URL into the body of a delivered Note as a link. This feature stores that URL as a field separate from the body.
- Bulk import from Cosense, retries, and merging a local edit with a newer source page. When import writes an entry, it passes this feature's validation and the same entry-and-edge update boundary. Import has no path that stores an entry directly.
- Public image URLs, rendering of notation other than links, and the ORM.
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
- When: The owner submits visibility public and an empty body.
- Then: A create does not make an entry. An update leaves the previous body and edges. The response is not an authentication failure.

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

### See saved articles on the edit screen

As the owner, I want the logged-in edit screen to list draft articles too, so that I can open an unpublished article and save a new visibility.

**Acceptance criteria:**

Scenario: The edit screen lists draft articles too

- Given: The request is verified as the owner. One article is draft and another is public. One note exists.
- When: The owner opens GET `/edit`.
- Then: Both articles appear, newest `updatedAt` first. The same timestamp is broken by descending immutable ID. Each item opens that article's edit screen. The note is not in this list. The unauthenticated home page and title index do not include the draft body.

### Post a note from the home page

As the owner, I want a note field on the home page, under the navigation, so that a body becomes a public note with no title and I can see its canonical URL. The field is absent unless the request is verified as the owner. The article draft form, the article list, and the notes list stay on the edit screen.

**Acceptance criteria:**

Scenario: An unverified home page omits the note field

- Given: The request is not verified as the owner. One deliverable entry exists.
- When: The caller opens GET `/`.
- Then: The response is 200 and lists that deliverable entry. The note field is absent. The response does not include a draft body.

Scenario: When the note field has a body, the host stores a public note and shows the canonical URL

- Given: The request is verified as the owner. GET `/` shows the note field under the navigation. GET `/edit` shows the article create form and the article list, and does not show the note field.
- When: The owner submits a body from the note field and does not submit a title.
- Then: One entry is stored with kind note, an empty title, the submitted body, and visibility public. It has no view path. No article is created. The response lets the owner see that the save succeeded and shows the canonical URL. The article list does not include this note. The notes list does. An unauthenticated request for the canonical URL returns the body. An unverified GET `/` does not show the note field.

Scenario: When the note field body is empty, the host stores nothing and shows the refusal

- Given: The request is verified as the owner.
- When: The owner submits an empty body from the note field.
- Then: The host stores no entry. The response lets the owner distinguish that the refusal is the empty body. This is not an authentication failure. A body of only whitespace is not empty.

Scenario: When the owner uses the article form, the host still creates a draft article

- Given: The request is verified as the owner.
- When: The owner submits a title and body from the article create form.
- Then: One entry is stored with kind article and visibility draft. No note is created. This response does not show a note canonical URL.

### See and delete saved notes on the edit screen

As the owner, I want the edit screen to list saved notes so that I can check the body I posted and delete a note without opening an edit screen.

**Acceptance criteria:**

Scenario: The edit screen lists notes apart from articles

- Given: The request is verified as the owner. One note is draft and another is public. One article exists.
- When: The owner opens GET `/edit`.
- Then: Both notes appear, newest `updatedAt` first. The same timestamp is broken by descending immutable ID. Each item shows the body and the visibility. Neither item opens the article edit screen. The article list does not include the notes.

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

### Save a bookmark on the edit screen

As the owner, I want the edit screen to create, list, update, and delete bookmarks so that an external URL and a comment are stored on this host apart from articles and notes.

**Acceptance criteria:**

Scenario: When the bookmark form has a title and an external URL, the host stores a draft bookmark

- Given: The request is verified as the owner.
- When: The owner submits a title, an external URL, and a body from the bookmark create form.
- Then: One entry is stored with kind bookmark, visibility draft, the submitted title, the submitted body, and that external URL. The body does not gain the URL. No article and no note are created. The bookmark is not in the article list or the notes list. It is in the bookmark list.

Scenario: When the bookmark form has an empty title, the host stores nothing

- Given: The request is verified as the owner.
- When: The owner submits kind bookmark from the bookmark create form with an empty title. A title of surrounding whitespace only is empty.
- Then: The host stores no entry. The response lets the owner distinguish that the refusal is the missing title.

Scenario: When the bookmark form has no external URL, the host stores nothing

- Given: The request is verified as the owner.
- When: The owner submits a title and a body from the bookmark create form and does not submit an external URL. A URL of surrounding whitespace only is missing.
- Then: The host stores no entry. The response lets the owner distinguish that the refusal is the missing external URL.

Scenario: The edit screen lists bookmarks apart from articles and notes

- Given: The request is verified as the owner. One bookmark is draft and another is public. One article and one note exist.
- When: The owner opens GET `/edit`.
- Then: Both bookmarks appear, newest `updatedAt` first. The same timestamp is broken by descending immutable ID. Each item shows the title, the external URL, and the visibility, and opens that bookmark's edit screen. The article list and the notes list do not include the bookmarks.

Scenario: When the owner updates a bookmark, the host replaces the title, body, visibility, and external URL

- Given: The request is verified as the owner. One bookmark exists.
- When: The owner opens GET `/edit/{id}` for that bookmark and submits a new title, body, visibility, and external URL.
- Then: Those four fields become the submitted values. The kind stays bookmark. The body does not gain the URL. The immutable ID stays.

Scenario: When a public bookmark update has an empty body, the previous bookmark remains

- Given: The request is verified as the owner. One bookmark exists and has a body.
- When: The owner submits visibility public and an empty body for that bookmark.
- Then: The host does not store the update. The previous title, body, visibility, and external URL remain.

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
- Then: The owner's get returns the body. The unauthenticated canonical URL responds as it would if that entry did not exist. The draft body does not appear in feeds, the title index, an empty page, or delivery.

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
- Then: The response is 401. The entry, its edges, and its visibility stay unchanged.

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

A deliverable entry has kind article, note, or bookmark, and visibility public. A page is not deliverable even when public. A draft is not deliverable.

publishedAt is the time the entry became deliverable. An entry that is not deliverable has no publishedAt. An update of an entry that is already deliverable does not change publishedAt. When an entry stops being deliverable and later becomes deliverable again, publishedAt becomes that later time.

##### View paths

The canonical URL is `https://weblog.yamanoku.net/e/{id}`. The ActivityPub object ID and the human-readable feed item ID use this URL. Feed contents and sending activities are decided by their own features.

The view path is `/{title}`. Spaces in the title become `_`, and the result is percent-encoded. A note with no title has no view path.

When a title that already contains `_` and a title whose spaces became `_` would share a path, that path is the view path of neither entry. A colliding page is public only at its canonical URL. A previous path dropped because of a collision redirects with 301 to that entry's canonical URL.

After a rename, the old title's path redirects with 301 to the current view path. When there is no current view path, it redirects with 301 to the canonical URL.

##### Body and edges

The entry and the edges made from its body commit in the same update. A reader cannot see only one of them in the new state. When the store cannot commit, both stay as they were.

An empty body is the empty string. A body that contains only whitespace is not empty.

A write with visibility public and an empty body is not stored. A create does not make an entry. An update leaves the previous body and edges. A change from draft to public is also not stored when the body is empty. This refusal is separate from an authentication failure.

A write with visibility draft stores an empty body as the empty string. A change from public to draft also stores the empty string when the body is empty.

An edge has the source immutable ID, the title written in the body, and the target immutable ID. An edge with no target remains. The host does not store the extraction syntax tree. It stores the line text and the edges produced by the following rules.

This write does not change another entry's body. The title string stored on an edge changes only when the owner rewrites the body of that edge's source. A rename alone does not change the title strings on other entries' edges.

Link extraction applies these rules to the line text.

- A line that starts with `code:` or `table:`, and the immediately following lines whose first character is whitespace, are not edge sources.
- Outside those lines, the tag title runs from immediately after `#` until before a space, `[`, `]`, or the end of the line.
- An empty tag title is not an edge. The edge title of `#2016 年にリメイクした` is `2016` only.
- Only the inside of a `[` and its matching `]`, containing no line break, is a page-edge candidate.
- When the inside starts with `http://` or `https://`, it is an external URL and not an edge.
- When any whitespace-separated part starts with `http://` or `https://`, it is not an edge.
- When the inside ends with `.icon`, it is an icon and not an edge.
- When the inside starts with `*`, `**`, `***`, or `-`, it is decoration and not an edge.
- Any other inside is a page title, normalized the same way as a title, and becomes an edge.

An unauthenticated resolution target is only a public entry whose current title matches. When no entry uses that string as its current title, and a public entry records it as a past title, the target is that entry. A draft resolves only in the owner's view. An edge with no matching public entry remains. Reading does not create an entry.

##### Get and list

The owner's get-one and list include draft and public entries of all four kinds. An unauthenticated response does not include a draft body. The public-reading feature decides the format of the unauthenticated list, feeds, and title index.

GET `/`, when the request is verified as the owner, shows the note field under the navigation. An unverified GET `/` omits that field and does not include a draft body. GET `/edit`, when the request is verified as the owner, returns the article create form, a list of stored articles, a separate list of stored notes, a bookmark create form, and a separate list of stored bookmarks. It does not show the note field. Those lists include draft and public. The article list does not include notes, bookmarks, or pages. Each article opens that article's edit screen. Each note shows its body and visibility and does not open the article edit screen. Each bookmark shows its title, external URL, and visibility, and opens that bookmark's edit screen. The order is newest `updatedAt` first, then descending immutable ID. An unauthenticated response does not return these lists. The note field does not submit a title. When it has a body, the host stores kind note, an empty title, and visibility public. The response shows that the save succeeded and shows the canonical URL. An empty body stores nothing. Deleting a note removes that note only. An article ID does not delete the article. The bookmark form stores kind bookmark and visibility draft. The external URL stays apart from the body. An empty title or a missing external URL stores nothing. Deleting a bookmark removes that bookmark only. An article ID or a note ID does not delete that entry.

##### A store that is past the free allowance

When a store cannot commit because it is past the free allowance, the entry and its edges stay as they were. The app does not move onto a paid plan. The response lets the owner distinguish that the store did not commit. The owner can also distinguish it from an authentication failure.

#### Exceptional behavior

##### An unverified request

A write, delete, or token issuance that is not verified as the owner returns 401 and does not change the entry or its edges. A refusal for invalid input is not 401. Design chooses any status code other than 401, without colliding with 404, 410, or 301.

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

When the browser authentication service cannot verify the owner, a browser write or issuance returns 401. Verification of an already issued CLI token does not use that service.

## Data requirements

### Required data

- **Entry:** Immutable ID, kind, normalized current title, past titles, body line text, visibility, created time, updated time, bookmark external URL, publishedAt, and Cosense page ID. After deletion, an undelivered entry leaves public get. A delivered deleted ID remains as a 410 without the body.
- **Edge:** Source immutable ID, title written in the body, and target immutable ID. The edges are replaced in the same update that stores the source body. An edge remains when it has no target.
- **CLI token hash:** Used to verify a token the owner issued. The token value is not retained. Reissue invalidates the previous hash.
- **Delivered record:** Shows that the entry was delivered at least once. The ActivityPub feature records it. This feature does not remove that record when visibility or kind changes, or when an undelivered entry is deleted. After deletion of a delivered ID, the record remains so the URL can return 410.

### Relationships

An entry has one immutable ID. It has one current title, except a note with an empty title. A past title is a former current title of that entry. An edge belongs to one source entry and points at zero or one target through the title written in the body. A bookmark's external URL is a field separate from that entry's body. A CLI token hash is the owner's write credential and does not belong to an entry. A delivered record corresponds to one immutable ID.

### Personal information

Browser-authentication identity and the CLI token identify the owner, yamanoku. The purpose is to limit writes to the owner. The identity and the token value do not appear in public responses.

The body, title, and bookmark URL may name the owner or another person. A public entry is readable without authentication. A draft body is readable only by the owner. This feature has no procedure for collecting a third party's consent other than the owner's choice of visibility.

The token hash is retained until reissue invalidates it. A deleted ID that was delivered remains, without the body, as a URL remote servers may still hold. There is no retention deadline.

## External service dependencies

- **Cloudflare Access (Zero Trust Free plan)**
  - **Related user stories:** Create an entry, Issue a CLI token and write with it
  - **Reason for dependency:** The browser editing screen verifies the one owner. The product has no signup. The first CLI token is issued from a session that this service has verified.
  - **Contractual and usage decisions:** Use the Free plan. Up to 50 seats have no extra charge, and the only seat used is the owner. Paid add-ons stay off. The app does not move itself onto a paid plan. When this service is removed, the owner decides the three requirements in the open questions below. The CLI token rules stay. Domain registration fees are outside this dependency's cost. A Cloudflare Community explanation dated 2026-10-17 says the Free plan reaches a cap by seat count. Paid add-ons such as Log Explorer are not billed unless the owner explicitly upgrades. A Free organization is not charged when the signup flow asks for payment information. That procedure was updated on 2026-10-12.

## Security considerations

Browser authentication of the owner, the CLI token, and server-to-server HTTP signatures are different credentials. An HTTP signature does not authorize a write. A CLI token does not authorize the sender of an inbox post.

Every write, delete, and token issuance verifies that the request is the owner's. Placing the browser editing screen behind the authentication service is not, by itself, enough to authorize a write.

An unauthenticated response does not return a draft body. An unauthenticated response does not show whether a draft exists.

The CLI token value and the secrets used to verify browser authentication do not appear in public responses or in the repository. The token hash is the form that may be stored.

## Open questions

Whether these extraction rules match the link range on the Cosense screen is undecided. Until the owner decides, edges are made by the rules above. The owner changes the rules after comparing a fetched body with the screen and judging that they differ. It is not established that they match.

The browser authentication method after Access is removed is undecided. Passkey is only a named candidate and is not adopted. Version 1 keeps Access for the browser. The CLI token rules stay. The owner decides the replacement. Until that decision, the contractual sentence above still stands.

When the owner decides to remove Access, the owner writes these three requirements.

- The first is the means that verifies a browser request is the owner. If passkey is that means, the requirements adopt it at that time.
- The second is how the session that issues the first CLI token is created. Issuing that token from a browser session that has already verified the owner stays required. The new method states how it creates that session.
- The third is whether the login boundary changes. Public reading, the human-readable feeds, and WebFinger stay outside login. The inbox and the CLI path `/entries` stay outside login too. Keeping that boundary is written as unchanged. Changing it names the paths that move.
