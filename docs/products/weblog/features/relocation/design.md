# Relocation design

[日本語](design.ja.md)

## About this document

This design decides how the owner carries out [Relocation](requirements.md) for [weblog.yamanoku.net](../../product.md). It does not choose the export file format. That choice stays open in the requirements.

### Audience

People and agents implementing or changing a move of this host.

### Prerequisites

The acceptance criteria in [Relocation](requirements.md). Entry data is defined by [Owner writing](../owner-writing/requirements.md). Image bytes are defined by [Public reading](../public-reading/requirements.md). The actor private key and delivered activity IDs are defined by [ActivityPub](../activitypub/requirements.md).

### Outside this document

- A file format, a file extension, or a serializer
- Changing entry rules, edge rules, or the CLI token
- A new hostname
- Contracting a paid plan

## Implementation approach

The deliverable is a recovery checklist, not a new request path. The owner restores the set named in the requirements, including the actor private key, on the new execution place. The owner then points HTTPS for `weblog.yamanoku.net` at that place and copies the bucket `gyazo-archives`.

No Worker route is added for the export. The application does not write an export file while the format is undecided. The domain does not import the Cloudflare SDK, a specific ORM, or Fedify types for this move.

## Architecture and sequence diagrams

No sequence diagram. A move is not a request flowing between the reader and the Worker. It is a checklist the owner runs outside a single HTTP exchange. The components are the restored store, the DNS name `weblog.yamanoku.net`, and the bucket `gyazo-archives`.

## Data model and ER diagrams

No new table and no new column. The rows to restore are the entries, edges, followers, and delivered activities that the other features already require. The actor private key is a secret, not a column. An ER diagram would only repeat those features' data, so this design omits one.

## APIs and interfaces

No new HTTP API. The owner's interface is the restore set and the DNS change. Because the file format is undecided, this design does not define a command line, a file name, or a response body for an export.

The hostname interface is HTTPS on `weblog.yamanoku.net`. The bucket interface is the existing bucket name `gyazo-archives`.

## External service integration

DNS is updated so the same hostname resolves to the new execution place. This design does not choose a DNS vendor. The vendor may change under the product's rule.

The bucket copy moves every object in `gyazo-archives`. This design does not choose a copy tool. A failed copy leaves the relocation incomplete. The old bytes are not deleted as part of a failed copy.

A Gyazo source URL that becomes private or expires is not a delete of the object. The copy still includes that object.

## Data handling

The private key is restored into the secret the ActivityPub requirements already name. It is not written to the repository, to logs, or to a public response by this design.

Follower actor URLs are copied with the follower rows. They are not given a second public document.

Entry bodies are restored as stored plain text. This design does not rewrite them when a source URL expires.

## Authentication and authorization notes

The owner is the only person who runs the move. Browser authentication and the CLI token are not a substitute for holding the private key during the restore. Those credentials stay the ones owner writing defines. They do not authorize a remote server to take the set.

## Security considerations

The private key crosses the move only in the owner's hands. A public checklist, a log, or a repository file is not the carrier. After the restore, signing uses the same key as before the move.

## Deployment notes

1. Restore the set from the requirements, including the actor private key, on the new execution place.
2. Point HTTPS for `weblog.yamanoku.net` at that place. Do not abandon the hostname.
3. Copy the bucket `gyazo-archives` with the host. Leaving the bucket behind does not finish the move.
4. Keep bucket bytes when a source Gyazo URL becomes private or expires.

Ordinary feature deploys do not run this checklist. There is no cron for relocation.

## Alternatives considered

### Abandon the hostname

A new name would avoid copying DNS. Remote servers would keep `acct:` values and object URLs on `weblog.yamanoku.net`, and those references would break. The requirements call that outcome a failed relocation. The hostname stays.

### Leave the bucket in the old account

The new place would not need a large copy. Public image reads would then miss the bytes, or they would depend on the old account. The requirements say a move that leaves the bucket behind is incomplete. The bucket moves.

### Delete bucket bytes when the source URL expires

The bucket would shrink to URLs that still answer. The requirements say the bytes remain after the source URL becomes private or expires. The object stays until the owner removes it by a later decision. This design does not add that delete.

## Open questions

The physical format of the export file is undecided, as the requirements state. Until the owner chooses a format, this design does not name one. The checklist above does not depend on a file extension.

No other question blocks the checklist. Choosing the format does not change the hostname rule or the bucket rule.
