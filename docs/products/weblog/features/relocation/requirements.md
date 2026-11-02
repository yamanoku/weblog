# Relocation

[日本語](requirements.ja.md)

## About this document

The owner can move weblog.yamanoku.net to another execution place and keep the same hostname. A storage choice is acceptable only when that move can restore the set below. The parent product is [weblog.yamanoku.net](../../product.md).

### Scope

- The items the owner can take out
- Restorability as the acceptance condition for a storage choice
- Restoring that set, including the actor private key, on the new execution place
- Pointing the same hostname at the new place
- Moving the bucket `gyazo-archives` with the host

### Out of scope

- The physical format of the export file. That format is an open question below.
- Entry fields, edge rules, and the CLI token. Those stay in [Owner writing](../owner-writing/requirements.md).
- Public HTML and how image bytes are read. Those stay in [Public reading](../public-reading/requirements.md).
- Follower delivery and the rule that the actor private key stays out of public responses and the repository. Those stay in [ActivityPub](../activitypub/requirements.md). This feature names the key as part of the restore set and does not replace that rule.
- A new hostname. The parent product keeps the published hostname.
- Custom-domain fees and the per-zone cap. Those figures stay in the parent product.

## User stories

### Move the host

As the owner, I want to restore this host on a new execution place so that readers and followers still use `weblog.yamanoku.net`.

**Acceptance criteria:**

Scenario: When the owner restores the set and keeps the hostname, the move succeeds

- Given: The owner has every item in the restore set, including the actor private key. The bucket `gyazo-archives` can be copied.
- When: The owner restores that set on the new execution place, points HTTPS for `weblog.yamanoku.net` at it, and moves the bucket with the host.
- Then: The hostname is unchanged. Immutable IDs and delivered activity IDs are the restored values. Followers' stored references to this hostname still name this host.

Scenario: When the hostname is abandoned, follower references break

- Given: Remote servers have stored `acct:yamanoku@weblog.yamanoku.net` or object URLs on this hostname.
- When: The owner serves the restored set under a different hostname and stops using `weblog.yamanoku.net`.
- Then: Those stored references no longer point at this host. This outcome is not a successful relocation.

Scenario: When a Gyazo source URL expires, the bucket bytes remain

- Given: An entry body still contains a Gyazo URL. The object bytes are in the bucket `gyazo-archives`.
- When: That source URL becomes private or expires.
- Then: The bytes remain in the bucket. This feature does not change the stored body because of that expiry.

Scenario: When the bucket is left behind, the relocation is incomplete

- Given: The bucket `gyazo-archives` holds the archive bytes.
- When: The owner moves the execution place and does not move that bucket.
- Then: The relocation is not complete. The new place does not gain those bytes from this feature.

## KPIs

### No numeric target

- **Current value:** None. A relocation has not been run.
- **Target value:** None. Success is the restored set on the same hostname.
- **Measurement method:** The owner compares the restored items with the set in Data requirements.
- **Measurement period:** At the time of a move.

## Functional requirements

### Accept only restorable storage

**Overview:** A storage choice is accepted only when the owner can restore the whole set.

**Input:** A proposed way to store the host.

**Output:** The choice is accepted or rejected.

#### Applicable conditions

##### The set

The owner can take out every item listed under Required data. The actor private key is one of those items. A choice that cannot restore any one item is rejected. Public responses and the repository still omit the private key, as [ActivityPub](../activitypub/requirements.md) requires.

#### Exceptional behavior

##### No export file yet

This feature writes no export file while the file format stays undecided. The acceptance condition still applies to the storage that is running.

### Keep the hostname during a move

**Overview:** A successful move serves the same hostname from the new execution place.

**Input:** The restored set and the actor private key on the new execution place.

**Output:** HTTPS for `weblog.yamanoku.net` from that place.

#### Applicable conditions

##### DNS

The DNS provider can be replaced when the hostname's HTTPS still resolves to this app. Replacing the provider does not change the hostname. Custom-domain fees and the cap per zone are the rules in [the product](../../product.md).

#### Exceptional behavior

##### A different hostname

Remote `acct:` values and object URLs that used `weblog.yamanoku.net` break. This feature does not rewrite copies stored on other servers.

## Data requirements

### Required data

The owner can take out the following items. Being able to restore them is an acceptance condition for the storage choice.

- **Immutable ID:** The entry id. It does not change on restore.
- **Kind:** The entry kind.
- **Current title:** The title stored now.
- **Past titles:** Titles the entry had before.
- **Body:** The stored plain-text body.
- **Visibility:** Draft or public.
- **Times:** The stored times, including created time, updated time, and publishedAt when one is stored.
- **Cosense page ID:** The external page id, when one is stored.
- **Edges:** The links stored for the entry.
- **Follower actor URL:** The actor URL of each current follower.
- **Delivered activity IDs:** The IDs of activities that were delivered.
- **Actor private key:** The signing key. It is part of this set and is not a public field.

### Relationships

One restore set contains the entries, their edges, the current followers, the delivered activity IDs, and the one actor private key. The bucket `gyazo-archives` moves with the host. Its bytes are not a field of the entry body.

### Personal information

A follower actor URL identifies a remote actor. Those URLs are already world-readable on the followers collection. The private key is not personal data of a follower. This feature does not publish a new copy of the key.

## External service dependencies

- **DNS for `weblog.yamanoku.net`**
  - **Related user stories:** Move the host
  - **Reason for dependency:** The hostname must resolve to the execution place that holds the restored set.
  - **Contractual and usage decisions:** The provider may change. The hostname stays. Fees and the per-zone cap are in [the product](../../product.md). This feature does not contract a paid plan.

- **Bucket `gyazo-archives`**
  - **Related user stories:** Move the host
  - **Reason for dependency:** Image bytes for the public host live in this bucket. [Public reading](../public-reading/requirements.md) reads them.
  - **Contractual and usage decisions:** A host move copies this bucket. A source URL that becomes private or expires does not delete the bytes. Storage beyond the free allowance stays outside the zero-yen target, as the parent product states.

## Security considerations

The actor private key is required to restore signing. It is not placed in a public response or in the repository. The owner handles it as a secret during the move.

Follower actor URLs in the set are the same URLs the followers collection already shows. This feature does not add a public list beyond that collection.

## Open questions

The physical format of the export file is undecided. The owner decides the format when choosing how to store the export. Until that decision, this feature does not name a format, a file extension, or a serializer.

The items that must be restorable, and the rule that restorability is an acceptance condition, are decided above. Those decisions stay while the format stays open.
