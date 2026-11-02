# ActivityPub

[日本語](requirements.ja.md)

## About this document

A remote instance follows `acct:yamanoku@weblog.yamanoku.net` and receives the public entries this host delivers. This host signs what it sends and checks the signature on what it receives. The owner does not approve each follow.

The parent product is [weblog.yamanoku.net](../../product.md). Which entries are deliverable is defined by [Owner writing](../owner-writing/requirements.md). Human-readable HTML and feeds are defined by [Public reading](../public-reading/requirements.md).

### Scope

- WebFinger, the actor, the inbox, the shared inbox, the outbox, and the followers collection
- Accepting a signed Follow and removing that follower on Undo
- Create, Update, and Delete for deliverable entries
- The Activity Streams object for a live public entry
- Retrying a send with the same activity ID when the free delivery allowance allows it

### Out of scope

- Following other actors from this host
- Replies, boosts, likes, and WebMention
- More than one user on this host
- A client posting API. Owner writes stay in owner writing
- Human-readable HTML, Atom, JSON Feed, the title index, empty pages, and Gyazo bytes
- Bulk import from Cosense, and sending an activity for a page the owner has not made deliverable
- A block list or an owner approval step for Follow
- Changing the hostname or a published object ID
- The order of rendering Cosense notation other than links
- The UI framework and the ORM
- Choosing a paid plan after signature CPU is measured. That question stays on the parent product

## User stories

### Follow this host

As a remote instance, I want to follow `acct:yamanoku@weblog.yamanoku.net` so that I receive the public entries this host delivers.

**Acceptance criteria:**

Scenario: When WebFinger is asked for this account, it resolves to the actor

- Given: The resource is `acct:yamanoku@weblog.yamanoku.net`.
- When: A client requests WebFinger.
- Then: The response resolves that account to `https://weblog.yamanoku.net/users/yamanoku`. No login screen is shown.

Scenario: When the actor is requested, the document names one person

- Given: No login is presented.
- When: A client requests `GET /users/yamanoku`.
- Then: The document is a Person. Its id is `https://weblog.yamanoku.net/users/yamanoku`. Its preferredUsername is `yamanoku`. It includes the inbox, the shared inbox, the outbox, the followers collection, and the public key. The private key is absent.

Scenario: When a signed Follow arrives, the sender becomes one follower

- Given: The signature verifies. The activity is a Follow of this actor. That sender is not already a follower.
- When: The sender posts the Follow to the inbox or the shared inbox.
- Then: The sender is one follower. A second row is not created. The host will send an Accept. The owner does not have to approve the follow. The response is not an authentication failure.

Scenario: When the same follower sends Follow again, the host keeps one follower

- Given: That sender is already a follower. The signature verifies.
- When: The sender posts Follow again.
- Then: The follower list still has one row for that sender. The host can send Accept again.

### Undo a follow

As a remote instance, I want to undo my follow so that this host stops treating me as a follower.

**Acceptance criteria:**

Scenario: When a signed Undo matches a follower, that follower is removed

- Given: The signature verifies. The Undo refers to a Follow from a current follower.
- When: The sender posts the Undo to either inbox.
- Then: That follower is gone from the followers collection. Later deliveries do not target that sender.

Scenario: When an Undo matches no follower, the host changes nothing

- Given: The signature verifies. The Undo does not match a current follower.
- When: The sender posts the Undo.
- Then: The response is success. The followers collection is unchanged.

Scenario: When the activity is not Follow or Undo, the host accepts it and stores nothing

- Given: The signature verifies. The activity is not a Follow and not an Undo of a Follow.
- When: The sender posts it to either inbox.
- Then: The response is success. The host does not store the activity and does not show it.

### Receive a delivered entry

As a follower, I want a new public article, short post, or bookmark so that I receive it after I follow, without receiving this host's old pages.

**Acceptance criteria:**

Scenario: When an entry becomes deliverable, followers are sent one Create

- Given: The entry was not deliverable and had not been delivered. The owner makes it a public article, note, or bookmark. At least one follower exists.
- When: The owner save succeeds.
- Then: The save response does not wait for the follower POST. One Create addresses the Public audience and the followers collection. An article object has type Article. A note or bookmark object has type Note. The object id is `https://weblog.yamanoku.net/e/{id}`. The host does not also send the article as a Note. The entry is recorded as delivered.

Scenario: When nobody follows yet, the Create is still public

- Given: The followers collection is empty. The owner makes an entry deliverable.
- When: The owner save succeeds.
- Then: The Create addresses Public. The outbox includes that activity. The entry is recorded as delivered. No follower POST is required.

Scenario: When a page stays a page, no activity is sent

- Given: The entry is a page, including a page imported from Cosense. It may be public.
- When: The owner saves it without making it deliverable.
- Then: No Create, Update, or Delete is sent. The outbox does not gain an activity for it.

Scenario: When a new follower reads the outbox, past pages are absent

- Given: Delivered activities exist. Public pages that were never deliverable exist.
- When: The follower requests the outbox.
- Then: The outbox lists delivered activities and does not list those pages. Entries that were never delivered are absent. The host does not POST the older activities to the new follower's inbox.

### Update or remove a delivered entry

As a follower, I want later changes to a delivered entry so that I can see a body change and a removal.

**Acceptance criteria:**

Scenario: When the delivered body changes, followers are sent one Update

- Given: The entry is deliverable and has been delivered. The owner changes the body and it stays deliverable.
- When: The owner save succeeds.
- Then: One Update is sent for the same object id. The activity ID is new. The object id does not change.

Scenario: When only the title changes, the host does not send Update

- Given: The entry is deliverable and has been delivered. The owner changes the title. The body is unchanged. The entry stays deliverable.
- When: The owner save succeeds.
- Then: No Update is sent. The object id stays the canonical URL.

Scenario: When a delivered entry leaves the deliverable set, followers are sent Delete

- Given: The entry has been delivered. The owner deletes it, or changes it to draft or page.
- When: The owner save or delete succeeds.
- Then: One Delete is sent for the same object id. The delivered record remains. A later public GET of that id follows owner writing for 404 or 410.

Scenario: When the entry becomes deliverable again, the host sends a new Create

- Given: A Delete was sent for the object id. The owner makes that same entry deliverable again.
- When: The owner save succeeds.
- Then: One new Create uses the same object id and a new activity ID.

Scenario: When an entry was never delivered, a state change sends nothing

- Given: No delivery activity has been committed for the entry.
- When: The owner changes kind, visibility, or deletes it.
- Then: No Create, Update, or Delete is sent.

### Read the live object

As a remote instance, I want the Activity Streams object for a public entry so that the canonical URL is the object id.

**Acceptance criteria:**

Scenario: When the request asks only for Activity Streams, the live object is returned

- Given: The entry is public and is not deleted. Accept contains `application/activity+json` or `application/ld+json`. Accept contains neither `text/html` nor `*/*`.
- When: A client requests `GET /e/{id}`.
- Then: The response is the Activity Streams object for that entry. The id is the canonical URL. A draft is not returned. The stored plain-text body is not rewritten.

Scenario: When the request also accepts HTML, public reading returns HTML

- Given: The same public entry exists. Accept also contains `text/html` or `*/*`.
- When: A client requests `GET /e/{id}`.
- Then: The response is the HTML defined by public reading. This feature does not replace that HTML.

### Reject a bad signature

As the owner, I want an unverified inbox post to change nothing so that a caller cannot become a follower by presenting an unchecked signature.

**Acceptance criteria:**

Scenario: When the signature does not verify, the host refuses the post

- Given: The inbox post has a missing signature, a bad signature, or a signing key this host cannot use to verify it.
- When: The sender posts to either inbox.
- Then: The response is an authentication failure. It is not a 5xx response. No follower is added. No activity is stored.

### Retry delivery without a new activity ID

As a follower, I want a failed delivery to be tried again so that a free-tier delay does not invent a second activity.

**Acceptance criteria:**

Scenario: When a send fails, the same activity ID is kept

- Given: A delivery job exists. The signed POST fails, or the free queue allowance cannot take the job today.
- When: The host tries again.
- Then: The activity ID is the one chosen when the job was created. The object id is unchanged. The follower list is unchanged. The entry save is not repeated. The app does not move onto a paid plan.

Scenario: When the free queue allowance returns, a stored job can be sent

- Given: The job stayed stored because the free allowance could not take it, or because a queued message expired.
- When: The free allowance can take the job again.
- Then: The host sends that same activity ID. The owner does not have to save the entry again.

## KPIs

### No numeric target

The parent product sets no percentage target for availability or delivery success. This feature is accepted or rejected by the acceptance criteria above.

- **Current value:** None, because the feature is new
- **Target value:** None
- **Measurement method:** None
- **Measurement period:** None

## Functional requirements

### Publish the actor

**Overview:** One actor represents yamanoku. WebFinger and the actor document are public.

**Input:** `GET /.well-known/webfinger` or `GET /users/yamanoku`, without a login.

**Output:** The account resolution, or the Person document.

#### Applicable conditions

##### Identity

The actor id is `https://weblog.yamanoku.net/users/yamanoku`. The preferredUsername is `yamanoku`. The type is Person. WebFinger resolves only `resource=acct:yamanoku@weblog.yamanoku.net` to that actor id. Another resource does not resolve to this actor.

The actor document includes the inbox `https://weblog.yamanoku.net/users/yamanoku/inbox`, the shared inbox `https://weblog.yamanoku.net/inbox`, the outbox, the followers collection, and one public key. The private key is not in the document, the repository, a browser response, or a CLI response.

The public key is an RSA key of at least 2048 bits, created once for this actor. This feature does not publish an Ed25519 key as that actor key.

These routes are outside the browser login. `POST /users/yamanoku/inbox` and `POST /inbox` are the same inbox for this one user.

#### Exceptional behavior

##### The WebFinger resource is not this account

The response does not return this actor. No follower is added.

### Receive Follow and Undo

**Overview:** A verified Follow adds one follower and is answered with Accept. Undo removes that follower. The owner does not approve each follow.

**Input:** A signed activity posted to either inbox.

**Output:** Success, or an authentication failure that adds no follower.

#### Applicable conditions

##### Accept and duplicates

A verified Follow of this actor stores the sender as a follower before Accept has been delivered. Accept may be retried without another Follow. The same sender is stored once.

There is no block list. Any sender that can present a verifying signature can become a follower.

##### Other activities

A verified activity that is not Follow, and not an Undo of a current follower, is not stored and is not displayed. The response is success.

Undo of a current follower removes that follower. Undo that matches nothing leaves the collection unchanged and returns success.

#### Exceptional behavior

##### The signature does not verify

The response is an authentication failure and not a 5xx response. This includes a signature the host cannot check because the remote key cannot be used. No follower is added and no activity is stored.

### Deliver an entry

**Overview:** A deliverable change creates one activity. The signed POST to followers happens after the save, using a stable activity ID.

**Input:** A successful owner save or delete that changes delivery, as owner writing defines deliverable entries.

**Output:** A Create, Update, or Delete for followers and for the outbox, or no activity.

#### Applicable conditions

##### Which changes send an activity

An entry that becomes deliverable produces one Create. The audiences are the Public collection and the followers collection. `to` includes Public. `cc` includes the followers collection.

The object id is the canonical URL and does not change when the title changes. The id is not the title string. A title string would break remote references when the owner renames the entry. An article object has type Article and is not also sent as a Note. A note or bookmark object has type Note. Mastodon-family clients may display an Article more weakly than a Note. This version accepts that difference. Whether the display is insufficient is checked on a real client after publication. Changing the article object to a Note before that check is not decided.

The object `content` is HTML made from the stored plain-text body. Page links in that HTML are anchors. The stored body is not rewritten. A bookmark's Note also includes a link to the stored external URL. The receiver's link preview for that bookmark is left to the external URL. Article `summary` is the first 100 characters of the plain-text body. A shorter body uses the whole body. The summary does not add an ellipsis. A Note does not get that summary. `published` is the entry's publishedAt. `attributedTo` is the actor id.

A body change that leaves the entry deliverable produces one Update for the same object id. A title-only change does not produce Update. A change that only edits the bookmark URL does not produce Update.

Moving a delivered entry to draft or page, or deleting it, produces one Delete for the same object id. The delivered record stays, as owner writing requires. Making that entry deliverable again produces a new Create with the same object id and a new activity ID.

A change to an entry that has never had a delivery activity produces no activity. A public page, including an imported page, produces no activity until the owner makes it deliverable.

##### The activity ID

The activity ID is chosen once when the delivery job is created. Retries use that same ID. The activity ID is not the object ID. It is an HTTPS URL on `weblog.yamanoku.net`.

The entry is recorded as delivered when the Create job is committed, including when the followers collection is empty. Inbox acknowledgement is not required for that record.

##### The outbox and followers collection

The outbox lists delivered activities and nothing else. Newer activities come first. The same time is ordered by activity ID descending. Pages and never-delivered entries are absent. Reading the outbox does not POST history to a follower.

The followers collection lists current followers. A removed follower is absent. Both collections are available without the browser login. The page size is chosen by Design. Each page belongs to the same ordered set, and the set does not drop a member.

##### When the send runs

The save response does not wait for the follower POST. The delivery job is durable in the same commit as the entry change that caused it. A commit that cannot store the job does not leave the entry change without that job.

A failed POST leaves the job and retries with the same activity ID. Follower rows remain after a failed send. Delivery is at least once. A receiver that does not ignore a repeated activity ID can show the same activity more than once.

#### Exceptional behavior

##### The free delivery allowance cannot take the job

The entry change and the job stay stored. The job is not handed to the queue when the remaining free operations cannot cover one write, one read, and one delete of that message. A retry read also counts as an operation. The host tries the stored job again when the allowance can take it. The app does not move onto a paid plan.

A message that the queue deletes after its free retention still has its job in the store. The later send uses the same activity ID.

##### The store cannot record the job

The entry is not left committed without the job. The owner can tell this failure from an authentication failure. The app does not move onto a paid plan.

### Serve the live object

**Overview:** `GET /e/{id}` returns the Activity Streams object when the request asks for Activity Streams and does not accept HTML.

**Input:** `GET /e/{id}` with Accept containing `application/activity+json` or `application/ld+json`, and containing neither `text/html` nor `*/*`.

**Output:** The object described above, for a live public entry.

#### Applicable conditions

##### Live public entries

The object follows the Create object rules. The stored body stays plain text.

#### Exceptional behavior

##### The entry is not a live public entry

A draft or an unknown id is the same public not-found response as public reading. The body is not returned. A deleted id follows the 404 or 410 rule in owner writing, including the Tombstone. This feature does not replace the HTML response when Accept also allows HTML.

## Data requirements

### Required data

- **Actor:** One person, the actor id, the preferred username, the inbox, the shared inbox, the outbox, the followers collection, and the public key. The private key is retained for signing and is not published. It stays out of the repository.
- **Follower:** The remote actor this host accepted. One row for one sender. Removed on a matching Undo. Kept when a later send fails.
- **Activity:** The activity ID, the object ID, and the kind Create, Update, or Delete. The activity ID is kept for retries and for the outbox.
- **Delivery job:** The work to send one activity. It remains until a send attempt has succeeded, and it remains through a failure so the same activity ID can be tried again.
- **Delivered record:** The mark that a Create job was committed for the entry. Owner writing reads it for 410. This feature does not remove it when kind or visibility changes.

### Relationships

One actor has many followers and many activities. One entry has at most one object ID, the canonical URL. One entry can have many activities over time. One activity has one activity ID. A delivery job belongs to one activity. The delivered record belongs to one entry.

### Personal information

A follower's actor ID and inbox address are collected so this host can deliver. They appear on the followers collection, which is available without login. Delivered titles and bodies are world-readable. The private key is not personal data of a follower and is not published. This feature does not collect a reader's account.

## External service dependencies

- **Remote ActivityPub instances**
  - **Related user stories:** Follow this host, Undo a follow, Receive a delivered entry, Update or remove a delivered entry, Reject a bad signature
  - **Reason for dependency:** Follow, Accept, and delivery are messages those instances send or receive.
  - **Contractual and usage decisions:** This host signs outbound activities and verifies inbound signatures. There is no fee from this host for a follow. There is no approval step and no block list. A failed verification is an authentication failure, not a 5xx response.

- **Cloudflare Queues**
  - **Related user stories:** Receive a delivered entry, Retry delivery without a new activity ID
  - **Reason for dependency:** Follower delivery happens after the save, and a failed send must be retryable.
  - **Contractual and usage decisions:** The Workers Free allowance is 10,000 operations a day. One operation is each 64 KB written, read, or deleted. A message under 64 KB uses one write, one read, and one delete for a normal delivery. Each retry adds a read. The source is [Queues pricing](https://developers.cloudflare.com/queues/platform/pricing/), last updated 2026-10-30. Free retention is 24 hours and is not extended. The source for the 128 KB message limit and free retention is [Queues limits](https://developers.cloudflare.com/queues/platform/limits/), last updated 2026-10-30. A job that does not fit the remaining operations stays stored and is sent when the allowance can take it. The app does not move onto a paid plan.

- **Cloudflare Workers KV**
  - **Related user stories:** Reject a bad signature, Follow this host
  - **Reason for dependency:** A short-lived cache may hold a remote key. The cache is not the record of followers or jobs.
  - **Contractual and usage decisions:** The Free plan allows 100,000 reads a day. The source is the [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) page, updated 2026-10-02. The Free plan allows 1,000 writes a day. The source is [KV limits](https://developers.cloudflare.com/kv/platform/limits/), last updated 2026-10-30. When that write allowance is exhausted, this feature writes no further cache entries that day. Verification still fetches the remote key. A fetch that cannot be used is the authentication failure above. The app does not move onto a paid plan.

- **Cloudflare D1**
  - **Related user stories:** Follow this host, Receive a delivered entry, Retry delivery without a new activity ID
  - **Reason for dependency:** Followers, activities, and delivery jobs remain when a send fails.
  - **Contractual and usage decisions:** These rows use the same Free D1 allowance as the rest of the host. The daily row-read figure and the account storage figure are in [the product](../../product.md). A refusal keeps the rows that are already stored. The app does not move onto a paid plan.

## Security considerations

HTTP signatures authorize the inbox sender. A CLI token does not. An HTTP signature does not authorize an owner write. The browser login is not required for WebFinger, the actor, the outbox, the followers collection, or either inbox.

The private key is created once, stored as a secret, and omitted from public responses, logs, the repository, the browser, and the CLI. The public key is the RSA key on the actor document.

Any remote instance that can produce a verifying Follow becomes a follower. This feature has no block list. The followers collection is world-readable.

Delivery can show the same activity more than once when the receiver does not ignore a repeated activity ID.

Authentication or a large JSON parse can take about 10 to 20 ms. The source is [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), updated 2026-10-29. Signature work that repeatedly exceeds the free CPU allowance cannot run on the free plan. An inbox request or a queue consumer that repeatedly ends with `exceededCpu` is that case. Until that excess is measured, this feature does not contract a paid plan. The later choice stays the open question on the parent product.

## Open questions

None in this feature. Whether to reduce signature work or adopt a paid plan, after measurement shows the free CPU allowance is regularly exceeded, stays the open question on the parent product. Until that measurement, this feature does not contract a paid plan.
