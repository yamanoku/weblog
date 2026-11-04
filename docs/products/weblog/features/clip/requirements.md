# Clip

[日本語](requirements.ja.md)

## About this document

The owner clips one article, one tweet (one X post), or one YouTube video from a package separate from the Worker application. The owner chose a bookmark: an external URL plus a plain-text comment. The package builds that payload from the fixture and submits it with the owner's existing CLI token. The parent product is [weblog.yamanoku.net](../../product.md).

### Scope

- A clip package separate from the Worker application
- One article, one tweet, and one YouTube video, named by the fixture
- The bookmark payload for those sources: title, body, visibility, and URL
- Submit of that payload with the owner's CLI token
- The rule that a submit without that token stores no entry

### Out of scope

- A new entry kind, a new feed, and a new ActivityPub object type. Kinds, the plain-text body, and the bookmark URL field stay in [Owner writing](../owner-writing/requirements.md).
- Posting into an existing Mastodon or Misskey. The parent product already excludes that.
- Live fetching of an article, of X, or of YouTube, including oEmbed credentials and transcript download.
- An author, a transcript, a thumbnail, a video id, or an oEmbed document.
- Classifying a URL as an article, a tweet, or a YouTube video. The fixture names the source.
- Publishing the package to a browser store.
- Browser authentication after Access is removed. That question stays in [Owner writing](../owner-writing/requirements.md). This feature uses the CLI token the owner chose for the extension.
- A new paid Cloudflare runtime.
- Following other actors, replies, boosts, favorites, and WebMention.

## User stories

### Clip a noticed source

As the owner, I want to clip one article, one tweet, or one YouTube video from a separate package so that the host stores it as a bookmark under the same write rules as my other entries.

**Acceptance criteria:**

Scenario: When an article fixture has the bookmark fields, the package returns a bookmark payload

- Given: The fixture names the source `article`. It includes a non-empty external URL, a title, a plain-text body, and visibility `public`. The package does not fetch a network.
- When: The owner transforms that fixture.
- Then: The result names the source `article`. The payload kind is `bookmark`. The title is the fixture title after the owner-writing normalization. The body is the fixture body. The visibility is `public`. The bookmark URL is the fixture URL and is separate from the body. The body does not gain that URL.

Scenario: When a tweet fixture has the bookmark fields, the package returns a bookmark payload

- Given: The fixture names the source `tweet`. It includes a non-empty external URL, a title, a plain-text body, and visibility `public`. The package does not fetch a network.
- When: The owner transforms that fixture.
- Then: The result names the source `tweet`. The payload kind is `bookmark`. The title, body, visibility, and bookmark URL follow the same rules as an article clip. The body does not gain the URL.

Scenario: When a YouTube fixture has the bookmark fields, the package returns a bookmark payload

- Given: The fixture names the source `youtube`. It includes a non-empty external URL, a title, a plain-text body, and visibility `draft` or `public`. The package does not fetch a network.
- When: The owner transforms that fixture.
- Then: The result names the source `youtube`. The payload kind is `bookmark`. The title, body, visibility, and bookmark URL follow the same rules as an article clip. The body does not gain the URL.

Scenario: When the owner submits the payload with the CLI token, the host stores the bookmark

- Given: A transform result for `article`, `tweet`, or `youtube` has a bookmark payload. The submit presents the owner's CLI token. The entry list has some length.
- When: The owner submits that result.
- Then: The entry list gains one bookmark. The stored fields are kind `bookmark`, the payload title, the payload body, the payload visibility, and the payload bookmark URL. The token is not a stored field.

Scenario: When the same fixture is transformed twice, the payloads have the same content

- Given: One fixture names `article`, `tweet`, or `youtube` and includes the bookmark fields.
- When: The owner transforms that fixture twice.
- Then: The two results have the same source and the same bookmark payload.

Scenario: When the source is outside the three, the package returns no payload

- Given: The fixture omits `source`, or `source` is a string other than `article`, `tweet`, or `youtube`.
- When: The owner transforms that fixture.
- Then: The result names no source and has no bookmark payload. A later submit stores no entry.

Scenario: When a bookmark field is refused by owner writing, the package returns no payload

- Given: The fixture names one of the three sources.
- When: The title is empty after normalization, or the external URL is missing, or the visibility is `public` and the body is the empty string, or the visibility is neither `draft` nor `public`.
- Then: The result names the source and has no bookmark payload. The refusal distinguishes the missing title, the missing bookmark URL, the empty public body, or the invalid visibility. A later submit stores no entry.

Scenario: When a draft clip has an empty body, the package returns a bookmark with an empty body

- Given: The fixture names one of the three sources, has a title and an external URL, and has visibility `draft` and an empty body.
- When: The owner transforms that fixture.
- Then: The payload kind is `bookmark`, the visibility is `draft`, and the body is the empty string. The bookmark URL stays separate from the body.

Scenario: When the submit has no CLI token, the host stores no entry

- Given: A bookmark payload exists. The submit presents no CLI token.
- When: The package is asked to submit that payload.
- Then: The entry list length stays the same. The refusal is the missing owner verification. The token value is not written onto an entry.

## KPIs

### No numeric target

The parent product sets no percentage target. This feature is accepted or rejected by the acceptance criteria above.

- **Current value:** None, because the feature is new
- **Target value:** None
- **Measurement method:** None
- **Measurement period:** None

## Functional requirements

### Transform a fixture

**Overview:** The clip package reads a fixture the caller already holds. For `article`, `tweet`, and `youtube` it builds one bookmark payload from the title, the body, the visibility, and the URL. It copies no other fields.

**Input:** A fixture object. The source name is `article`, `tweet`, or `youtube`. The bookmark fields are `url`, `title`, `body`, and `visibility`. The package does not fetch them from a network.

**Output:** A result that names the source, plus either a bookmark payload or a refusal and no payload.

#### Applicable conditions

##### Sources

The sources are `article`, `tweet`, and `youtube`. `tweet` is one X post. `youtube` is one YouTube video. `article` is one web article. Comparison of the source name is case-sensitive. Any other name, a missing name, or a non-string name is outside the three. The three sources use the same four fields.

##### Kind

The owner chose `bookmark`. Owner writing defines a bookmark as an external URL plus a comment, and stores that URL apart from the body.

##### Extracted fields

The owner chose the same four fields for an article, a tweet, and a YouTube video.

The payload title is the fixture title after the owner-writing normalization: whitespace at both ends is removed, and consecutive whitespace becomes one space. The payload body is the fixture body when that value is a string, and the empty string when it is missing. The package does not rewrite the body and does not insert the URL into the body. The payload visibility is the fixture visibility, `draft` or `public`, as the owner set it. The payload bookmark URL is the fixture `url` string, stored apart from the body.

The source name is not an entry field.

##### Repeated transform

Two transforms of the same fixture return results with the same content. The package adds no clock value and no random value to the result.

#### Exceptional behavior

##### A source outside the three

The result names no source, includes no payload, and the refusal is `unknown_source`.

##### A title, URL, body, or visibility the host would refuse

The result names the source and includes no payload. An empty title after normalization is `missing_title`. A missing URL, a non-string URL, or a URL that is empty after removing whitespace at both ends is `missing_bookmark_url`. Visibility `public` with an empty body is `empty_body`. A whitespace-only body is not empty. Visibility other than `draft` or `public` is `invalid_visibility`. These names match the owner-writing refusals for the same cases. A draft with an empty body is a payload whose body is the empty string.

The package reports one refusal. It checks visibility, then title, then URL, then the public empty body.

### Submit a clip result

**Overview:** Submitting a bookmark payload with the owner's CLI token appends that bookmark to the entry list. The host surface for the write remains the owner-writing create. This feature adds no write route.

**Input:** A clip result, the CLI token, and the current entry list.

**Output:** The entry list with one added bookmark, or the same list with a refusal.

#### Applicable conditions

##### The CLI token

The owner chose the existing CLI token as the extension's proof. The product already allows a program to call the owner write with that credential. The package does not issue a token, does not replace Access, and does not adopt a passkey.

The submit presents the token as a non-empty string. The stored bookmark does not include the token.

##### Fields written

The added entry has kind `bookmark`, the payload title, the payload body, the payload visibility, and the payload bookmark URL. No other field is added.

##### No new host route

This feature does not add a route, a form, or a second database. The create that persists on the host stays the create in [Owner writing](../owner-writing/requirements.md).

#### Exceptional behavior

##### An unverified submit

A submit with a missing token, or a token that is not a non-empty string, stores nothing. The entry list length stays. The refusal is `unauthorized`.

##### A result with no payload

A submit that has the token and a result with no payload stores nothing. The refusal is `no_payload`.

## Data requirements

### Required data

- **Clip fixture:** Names one source, `article`, `tweet`, or `youtube`, and carries `url`, `title`, `body`, and `visibility`. This feature does not retain the fixture after the transform returns.
- **Bookmark payload:** Kind `bookmark`, normalized title, plain-text body, visibility `draft` or `public`, and the external URL separate from the body.
- **CLI token:** The credential presented at submit. It is not part of the bookmark and is not retained by the package after submit returns.
- **Entry:** The bookmark appended to the caller's entry list. The host entry remains the entry defined by [Owner writing](../owner-writing/requirements.md).

### Relationships

One transform reads one fixture and returns one result. A result with a payload refers to one bookmark. The bookmark URL is a field of that bookmark and is separate from its body.

### Personal information

A fixture may quote a page, a post, or a video the owner saw, and that text may name a person. A public bookmark is readable without authentication, under the personal-information rules in owner writing. A draft body stays with the owner. The CLI token identifies the owner and does not appear in the stored bookmark.

## External service dependencies

None. The package does not call X, YouTube, a browser-store vendor, or a new Cloudflare product. The CLI token is the credential owner writing already uses. It is not a new service.

## Security considerations

The package does not store the CLI token in the bookmark, in the repository, or after submit returns. A bookmark payload is not itself a credential.

A submit without the token stores nothing. The package does not post the fixture to Mastodon, Misskey, or any other server.

## Open questions

None. The owner chose kind `bookmark`, the fields title, body, visibility, and URL, and the existing CLI token. Browser authentication after Access is removed stays open in [Owner writing](../owner-writing/requirements.md). This feature does not decide it.
