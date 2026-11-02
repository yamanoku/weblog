# Cosense import

[日本語](requirements.ja.md)

## About this document

The owner imports pages from the public Cosense project into this host with the CLI. A new page is stored as a public page and is not delivered. A later run replaces the body only when the local body still matches the last import and the source is newer. A local edit is reported and left in place.

The parent product is [weblog.yamanoku.net](../../product.md). Writes use the validation and the entry-and-edge update boundary in [Owner writing](../owner-writing/requirements.md).

### Scope

- A CLI batch that reads the public project `https://scrapbox.io/yamanoku/`
- Creating a public page entry for a Cosense page that is not stored yet
- Continuing an unfinished list walk, and rechecking the list after the walk has finished
- Replacing a matching body, or reporting the Cosense page ID and leaving a local edit
- Waiting and retrying when the source or the free store allowance does not accept the next page
- Leaving Gyazo URLs and `scrapbox.io/files` URLs as text in the body

### Out of scope

- The owner's manual create, update, delete, browser authentication, and CLI token rules. This feature uses a CLI token that owner writing has already issued
- Choosing article, note, or bookmark for an imported page. The owner changes kind afterwards through owner writing
- Sending activities, and the ActivityPub actor, Follow, and signatures
- Human-readable feeds, title index, empty-page HTML, and the bytes of a Gyazo image. Those belong to [Public reading](../public-reading/requirements.md)
- Copying image or file binaries, and uploading into the bucket `gyazo-archives`
- Importing articles from `archives.yamanoku.net`
- Two-way sync back to Cosense
- The order of rendering Cosense notation other than the edges owner writing already extracts
- The UI framework and the ORM
- A procedure that writes the newer Cosense body over a local edit. The open question below records that this feature does not do that

## User stories

### Import a new page

As the owner, I want a public Cosense page to become a page on this host so that its text and title links live here without entering the feed or a delivery.

**Acceptance criteria:**

Scenario: When the page is not stored yet, the host creates one public page

- Given: The CLI token is valid. The public project has a page with a page ID, a title, and line text. No entry stores that page ID. The fetched body is not empty.
- When: The owner runs the import.
- Then: One entry exists. Its kind is page and its visibility is public. The immutable ID is new and is not the Cosense page ID. The canonical URL is `https://weblog.yamanoku.net/e/{id}`. The Cosense page ID is stored on that entry. The body is the fetched plain text, and the first line remains even when it equals the title. Bracket characters are unchanged. The entry is not deliverable. This run does not send an activity.

Scenario: When the same page is stored again, the host does not create a second entry

- Given: An entry already stores that Cosense page ID. Its body equals the last imported body. The source updated time is not newer than the time stored for that import.
- When: The owner runs the import.
- Then: The body, title, edges, kind, and visibility stay as they were. The immutable ID stays. No second entry is created. The page ID is not reported as a conflict.

### Continue the list and recheck it

As the owner, I want a long import to continue after a stop so that a rerun does not start from zero, and a finished import can later pick up a newer source page.

**Acceptance criteria:**

Scenario: When the list walk has not finished, the next run continues after the last completed page

- Given: The walk recorded a completed Cosense page ID and has not finished the list. Entries for completed page IDs are already stored.
- When: The owner runs the import again.
- Then: The run continues after that recorded page ID. Completed pages of this walk are not fetched again. Stored entries remain. The project is not imported inside one request to this host.

Scenario: When the list walk has finished, the next run checks the list from the start

- Given: The previous walk finished the list. One stored page has a newer source updated time, and its current body still equals the last imported body. The fetched body is not empty.
- When: The owner runs the import again.
- Then: The run reads the list from the start and applies the replace rules. That page's body is replaced. Its immutable ID stays. Pages whose body and source time do not call for a replace are left as they are.

Scenario: When the source asks the client to wait, the same page is retried

- Given: A list request or a page-text request returns HTTP 429 with `Retry-After`, or returns HTTP 429 without that header, or returns a 5xx status.
- When: The owner’s import receives that response.
- Then: The command retries that same request. A 429 with `Retry-After` waits for the delay in that header. A 429 without the header, and a 5xx response, wait 60 seconds. The 60 seconds is not a delay between successful fetches. The page is not skipped. The app does not move onto a paid plan.

Scenario: When the free write allowance cannot take the next page, the run waits until the allowance returns

- Given: The next page's write does not fit in the free daily write allowance, or the write is refused because that allowance is exhausted.
- When: The import is about to store that page, or the store refuses the write.
- Then: The page is not recorded as completed. Stored pages remain. The entry and its edges stay as they were when a write was refused. The run waits until 00:00 UTC and then continues after the recorded page ID. The app does not move onto a paid plan.

### Keep a local edit

As the owner, I want a page I edited locally to stay when Cosense has a newer copy so that the import does not choose between the two texts for me.

**Acceptance criteria:**

Scenario: When the local body differs from the last import, the newer source stays out

- Given: An entry stores the Cosense page ID. Its current body differs from the last imported body. The source has another body, and that source updated time may be newer.
- When: The owner runs the import.
- Then: The current body, title, edges, kind, and visibility stay. The newer source body is not stored. The last imported body stays the previous snapshot. The command reports that Cosense page ID as a local edit. It does not create a second entry.

Scenario: When the body still matches and the source is newer, the host replaces the text

- Given: The current body equals the last imported body. The source updated time is newer. The fetched body is not empty. The owner may already have changed the entry's kind or visibility.
- When: The owner runs the import.
- Then: The title and body become the fetched title and plain text. Edges are rebuilt from that body in the same update. Kind, visibility, the bookmark URL, the Cosense page ID, and the immutable ID stay as they were. The last imported body becomes the body just stored. The source updated time stored for the comparison becomes the source time just read. The page ID is not reported as a local edit.

Scenario: When a public import has an empty body, that page is refused and the walk continues

- Given: The fetched body is the empty string. The entry that would result is public. This includes a new page and an update that would stay public.
- When: The owner runs the import.
- Then: A create stores no entry. An update leaves the previous body and edges. The refusal is not reported as a local edit, and it is not an authentication failure. The command reports the Cosense page ID as a refused empty body. The walk continues with the next page. A body of only whitespace is not empty.

### Leave file URLs in the body

As the owner, I want Gyazo and Cosense file URLs to remain text so that the import does not make a second copy of those files.

**Acceptance criteria:**

Scenario: When the body contains a Gyazo URL or a scrapbox.io file URL, the URL string remains

- Given: The fetched plain text contains an `i.gyazo.com` URL, a `gyazo.com` URL, or a `scrapbox.io/files` URL.
- When: The owner runs the import and the page is stored.
- Then: The stored body still contains that URL string. The host does not upload bytes into the bucket `gyazo-archives`. The host does not copy the `scrapbox.io/files` object. Brackets around the URL stay as fetched.

Scenario: When a scrapbox.io file URL later stops being public, this feature has no copy

- Given: A stored body contains a `scrapbox.io/files` URL. That URL later becomes private or expires.
- When: A reader opens the entry.
- Then: This feature has no stored file to show for that URL. The entry body still contains the URL string.

## KPIs

### No numeric target

The parent product sets no percentage target for availability or delivery success. This feature is accepted or rejected by the acceptance criteria above.

- **Current value:** None, because the feature is new
- **Target value:** None
- **Measurement method:** None
- **Measurement period:** None

## Functional requirements

### Write an imported page

**Overview:** One Cosense page becomes one entry, through the same validation as an owner write. The import does not store an entry by a path that skips that validation.

**Input:** A valid CLI token, the Cosense page ID, the title, and the fetched line text.

**Output:** The stored entry, or a refusal that leaves the previous entry and edges unchanged.

#### Applicable conditions

##### Which project and which text

The only source is the public project `https://scrapbox.io/yamanoku/`. The list is `https://scrapbox.io/api/pages/yamanoku`. List elements do not include the body lines. The body is the plain text from `https://scrapbox.io/api/pages/yamanoku/{title}/text`. The import does not convert brackets.

On 2026-11-01 that list reported `count` 7651. The count can grow. The number is not a quota. The whole project is not imported inside one request to this host. Each stored page is its own committed write.

##### Fields a create sets

A create sets kind to page and visibility to public. The immutable ID and the canonical URL follow owner writing. The Cosense page ID is stored and is unique among entries. The body is the fetched line text, including a first line that equals the title. The bookmark URL is empty. The entry is not deliverable, so it has no publishedAt and this feature does not send an activity.

The entry's created time is the time the create commits. The entry's updated time is the time a later write commits. Those times are not replaced by the Cosense timestamps. The source updated time is stored beside them and is used only to decide whether a later source copy is newer.

The last imported body is the line text of the last write this feature committed for that page.

##### Fields a later import keeps

A successful replace writes the fetched title and body and rebuilds the edges in the same update. It leaves kind, visibility, the bookmark URL, the Cosense page ID, and the immutable ID unchanged. A title change follows the rename rules in owner writing. This feature does not clear a delivered record. It does not change another entry's body.

An owner write that is not this import also leaves the Cosense page ID in place, as owner writing requires. This feature does not delete an entry. After the owner deletes the entry, a later import of the same Cosense page ID creates a new entry with a new immutable ID.

#### Exceptional behavior

##### The CLI token does not verify

A run without a valid CLI token stores nothing and does not advance the completed-page record. The refusal matches an unverified owner write.

##### The body is empty

An empty body is the empty string. Whitespace only is not empty. A create that would be public with an empty body stores no entry. An update that would stay public with an empty body leaves the previous body and edges. The page is reported as a refused empty body, not as a local edit. The walk continues at the next page.

##### The store does not commit

When the write does not commit, the entry and its edges stay as they were. The page is not recorded as completed. A refusal because the free allowance is exhausted waits until 00:00 UTC. The response the owner sees is distinguishable from an authentication failure. The app does not move onto a paid plan.

### Walk, retry, and resume

**Overview:** The CLI walks the project list. An unfinished walk continues. A finished walk can be run again from the start.

**Input:** The owner starts the import from the CLI.

**Output:** Stored pages, a continued or restarted walk, and the reported page IDs described below.

#### Applicable conditions

##### List order

The walk follows the project list. When one list response does not contain the rest of the list, the next list request continues from that response. The continuation uses the `X-Following-Id` header of the `search/titles` response. Pages are handled in that list order.

A page whose write committed is recorded as completed for the current walk. The record is the Cosense page ID.

##### Unfinished and finished walks

While the walk has not finished, the next run continues after the last completed page ID. It does not fetch those completed pages again.

When the walk has finished, the next run reads the list from the start and applies the replace and report rules. It does not create a second entry for a Cosense page ID that is already stored.

#### Exceptional behavior

##### The source asks for a retry

HTTP 429 with `Retry-After` waits for that header, then retries the same list request or the same page text. HTTP 429 without the header, and any 5xx response, wait 60 seconds and retry the same request. The wait is not inserted between successful fetches. The page is not recorded as completed before the retry succeeds. The app does not move onto a paid plan.

##### One page is not available

When one page's text request fails with a status other than 429 or 5xx, the run does not store a new body for it and does not delete an existing entry. The page is not recorded as completed. The command reports the Cosense page ID. The walk continues with the next page. This includes a page the source no longer has.

##### The list itself is refused

When the list request fails with a status other than 429 or 5xx, the run stops. It does not mark new pages as completed. The unfinished cursor stays where it was.

### Report a page that was not written

**Overview:** The owner sees which Cosense page IDs were not written, and why, without receiving the page body in that report.

**Input:** The result of a page the walk did not commit.

**Output:** The Cosense page ID and which of the outcomes below it is.

#### Applicable conditions

##### Local edit

The current body differs from the last imported body. The source body is not written. The report calls the page ID a local edit. While that difference remains, a newer source body does not enter. Kind and visibility stay. A difference in title alone, while the body still equals the last imported body, is not a local edit. The replace rules can still update the title from the source when the source body is newer.

##### Refused empty body

The fetched body is empty and the resulting visibility is public. The report calls the page ID a refused empty body. This outcome is distinct from a local edit.

##### Page text not available

The page text request failed as described above. The report calls the page ID not available. This outcome is distinct from a local edit and from a refused empty body.

The report does not include the entry body, the last imported body, or the CLI token.

## Data requirements

### Required data

- **Imported entry:** The entry fields owner writing stores, including kind, visibility, title, body, immutable ID, canonical URL, and bookmark URL. A create from this feature is a public page. A later import does not use those fields to change kind, visibility, or the bookmark URL.
- **Cosense page ID:** The external identity of the source page. At most one entry holds a given page ID. The owner’s manual write does not clear it. This feature does not show it as a field the owner types. It remains for as long as that entry exists.
- **Last imported body:** The line text committed by the last successful import of that page. It is kept so a later local edit can be recognized. It is replaced only when a later import commits. It is not a separate public page.
- **Source updated time:** The updated time read from Cosense when the last successful import committed. It is compared as the source time, not as the entry's updated time. It is replaced only when a later import commits.
- **Walk cursor:** The last Cosense page ID completed in the current unfinished walk, and whether that walk has finished. An unfinished walk uses it to continue. A finished walk starts from the list head on the next run.

### Relationships

One Cosense page ID corresponds to at most one entry. That entry has one last imported body and one source updated time. The walk cursor is the position in the project list, not a field of every entry. Edges belong to the entry and follow owner writing. A public page is not a deliverable entry.

### Personal information

An imported title or body may name the owner or another person. The create stores the page as public, so that text is world-readable. The source project is already public. This feature collects no account data.

The report of page IDs is for the owner running the CLI. It is not a public response. The CLI token value does not appear in the report, in a public response, or in the repository.

## External service dependencies

- **Cosense, public project `https://scrapbox.io/yamanoku/`**
  - **Related user stories:** Import a new page, Continue the list and recheck it, Keep a local edit, Leave file URLs in the body
  - **Reason for dependency:** The pages and the plain-text bodies come from this project. The list does not include the body lines.
  - **Contractual and usage decisions:** The source is this public project only. This feature does not add a paid Cosense plan. HTTP 429 follows `Retry-After` when that header is present. A 429 without the header, and a 5xx response, wait 60 seconds and retry the same request. The app does not move itself onto a paid plan.

- **Cloudflare D1, through the owner write**
  - **Related user stories:** Import a new page, Continue the list and recheck it
  - **Reason for dependency:** Each stored page is a write of an entry and its edges. The free daily write allowance is the product's D1 allowance.
  - **Contractual and usage decisions:** When the next page does not fit in the remaining free daily write allowance, or a write is refused because the allowance is exhausted, the page is not completed and the run waits until 00:00 UTC. Stored rows remain. The app does not move itself onto a paid plan.

## Security considerations

The import runs with the owner's CLI token. A run that does not verify the token stores nothing and does not advance the walk. HTTP signatures do not authorize the import. Browser authentication is not the credential for this command.

The report lists Cosense page IDs to the owner and does not include entry bodies or the token value. Pages this feature creates are public. A local edit that stays in place keeps the visibility the owner already set.

## Open questions

The procedure for adopting a newer Cosense body after a local edit is undecided. Until the owner decides that procedure, this feature reports the Cosense page ID, leaves the local body and edges in place, and does not take in the newer source body while the body still differs. The owner decides. The decision does not change the create, resume, or replace rules above.

Whether the edge rules match the link range on the Cosense screen stays the open question in owner writing. This feature uses those rules and does not change them.
