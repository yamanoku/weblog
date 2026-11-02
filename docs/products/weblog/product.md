# weblog.yamanoku.net

[日本語](product.ja.md)

## Overview

weblog.yamanoku.net is the public hypertext of one person, yamanoku. Hypertext here means pages whose titles can be followed in both directions. The host publishes blog articles, short posts, bookmarks, and pages brought in from [the Cosense project yamanoku](https://scrapbox.io/yamanoku/). An entry is the stored unit of body text. Those four kinds are entries on this host, not separate applications. The canonical body is plain text. HTML shown to readers is produced from that text and is not the stored form.

People can read the public pages and the human-readable feeds. ActivityPub is the protocol other instances use to follow an actor and receive activities. A remote instance can follow `acct:yamanoku@weblog.yamanoku.net` and receive the public entries this host delivers. Delivered entries are public articles, short posts, and bookmarks. A page brought in from Cosense stays out of the human-readable feeds and out of delivery until the owner changes its kind.

The host is `weblog.yamanoku.net`. The only writer is the owner, and the product has no signup. The product does not include the following.

- Following other actors
- Replies, boosts, and favorites
- WebMention
- Realtime co-editing
- A migration from [archives.yamanoku.net](https://archives.yamanoku.net/)
- Two-way sync with Cosense
- Visual design and the choice of an ORM

## Background and problems

### Background

[archives.yamanoku.net](https://archives.yamanoku.net/) is a static archive of yamanoku's past articles. On 2026-11-01 the page described itself as a collection of past articles and logs, and said the contents are not updated except for link repairs made during the migration. Static files cannot hold an inbox, signatures, or delivery to followers. They also cannot take updates from both a browser and a CLI.

[The Cosense project yamanoku](https://scrapbox.io/yamanoku/) already stores pages linked by title. On 2026-11-01 the project page listed those titles as links. Cosense does not provide this host's ActivityPub actor, remote follow, or a write path limited to the owner. That gap was recorded when the scope of this product was set, in [the architecture note](../../ARCHITECTURE.md).

### Problems to solve

The owner keeps articles, short posts, bookmarks, and linked notes in different places. The static archive cannot accept a remote follow, and it cannot take writes from both a browser and a CLI. Cosense pages can be followed by title, and they are not published as this host's actor.

A reader without an account has no place on this host to read public entries and follow their titles. There is also no place to subscribe to a human-readable feed.

A remote ActivityPub instance has no actor `acct:yamanoku@weblog.yamanoku.net` to follow. It also cannot receive the public entries this host delivers.

## Target users

### Owner yamanoku

- **Characteristics:** The only person who writes on this host. Uses a browser and a CLI. Brings pages from the public Cosense project onto this host.
- **Problems:** Articles and linked pages live in different places. No single host offers remote follow and writes limited to the owner.
- **Usage context:** Creates, updates, publishes, and deletes entries. Brings public Cosense pages onto this host. A program can call the same write path with the owner's CLI credential.

### Unauthenticated readers

- **Characteristics:** People who open the public site without an account.
- **Problems:** Without logging in, they cannot read this host's public entries. They cannot follow titles in both directions. They also cannot subscribe to a human-readable feed.
- **Usage context:** Read public pages and subscribe to the human-readable feeds.

### Remote ActivityPub instances

- **Characteristics:** Servers that follow an actor on another instance and receive signed activities.
- **Problems:** They cannot follow this host's actor. They also cannot receive the public entries this host delivers.
- **Usage context:** Follow the actor, receive delivery, and undo the follow. They do not write entries.

## Value provided

### One public hypertext

- **Recipient:** The owner and unauthenticated readers
- **Offering:** Blog articles, short posts, bookmarks, and imported pages on one host. Title references can be followed in both directions.
- **Reason:** The owner wants one site and the same bidirectional title links as the Cosense project. The static archive collects past articles. Cosense is not this host's public site.

### Human-readable feeds

- **Recipient:** Unauthenticated readers
- **Offering:** Feeds of the entries published for people
- **Reason:** The owner wants human-readable feeds. Delivery to remote instances is a separate path.

### Remote follow

- **Recipient:** Remote ActivityPub instances, and the owner who wants to be followed
- **Offering:** Follow `acct:yamanoku@weblog.yamanoku.net` and receive the public entries this host delivers
- **Reason:** The static archive cannot receive a follow. It also cannot deliver to followers. The owner wants other instances to be able to follow this host.

### Writes limited to the owner

- **Recipient:** The owner
- **Offering:** Create, update, publish, and delete entries from the browser and the CLI.
- **Reason:** The only writer is the owner. The product has no signup. The owner named the browser and the CLI as the two write paths.

### A runtime that can be removed

- **Recipient:** The owner
- **Offering:** Keep the new cost of running the app at zero yen, and allow the runtime parts to be replaced later
- **Reason:** The owner named Cloudflare's free tier as the first place to run the app, and asked for those parts to be removable. Domain registration fees paid to a registry are outside the zero-yen target. So is the part of the existing Gyazo archive storage that exceeds 10 GB a month.

## Definition of success

The product is successful when all of the following hold.

- The owner can publish articles, short posts, and bookmarks to weblog.yamanoku.net from the browser and the CLI, and can bring public Cosense pages onto the same host.
- A person who is not logged in can read public entries and follow title links in both directions. They can also read the human-readable feeds.
- A remote instance can follow `acct:yamanoku@weblog.yamanoku.net` and receive the public entries this host delivers.
- Pages brought in from Cosense stay out of the human-readable feeds until the owner changes their kind. They also stay out of remote delivery.
- The new cost of running the app is zero yen. Work past the free allowance fails or waits until 00:00 UTC the next day. The app does not move itself onto a paid plan.

## Development principles

- The only writer is the owner. There is no registration API.
- The canonical body is plain text. HTML for display is produced from that text.
- After publication, the hostname and the published ActivityPub identifiers stay unchanged. Changing the hostname breaks the `acct:` and object identifiers that remote servers have stored.
- Entry rules stay free of a Cloudflare SDK. Runtime parts remain replaceable.
- Staying at zero yen for new runtime cost comes before continuing work that no longer fits the free allowance. That work fails or waits until 00:00 UTC the next day. The app does not move itself onto a paid plan.
- Domain registration fees are outside the zero-yen target. So is existing Gyazo archive storage beyond 10 GB a month.
- Pages brought in from Cosense are not classified automatically into articles, short posts, or bookmarks. They are not delivered to followers in bulk.
- This purpose does not choose a UI framework or an ORM.

## SLA, SLI, and SLO

### SLA

None. The product does not promise availability to readers or to remote instances. It also does not promise a delivery time. Work past the free allowance fails or waits until the next day. The app does not move itself onto a paid plan. The owner decided this. A promise of availability would require paid capacity that this product does not buy.

### SLI and SLO

No numeric target. The operating rule is to fail or wait when the free allowance is used up, not to hit an availability percentage. The product also sets no percentage target for delivery success.

Whether creating or checking HTTP signatures fits the free tier's CPU time per invocation has not been measured. That measurement is the trigger for the open question below. It is not a current SLO.

## Open questions

It is undecided whether, if creating or checking HTTP signatures regularly exceeds the free tier's CPU time per invocation, the owner will reduce that work or adopt a paid plan. Until the owner decides, do not contract a paid plan. Work that cannot run inside the free tier does not run. The owner decides after measurement shows that the CPU time is exceeded as a regular case.

The following are outside this purpose. Decide each one in the Requirements that own it.

- Rendering of Cosense notation other than links
- Merging a local edit with a newer Cosense page

Until then, leave the treatment in [the architecture note's open questions](../../ARCHITECTURE.md) as written. Do not change the purpose, the users, or the value.
