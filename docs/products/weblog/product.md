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
- Cosense pages created after the migration set. The set is defined in [Cosense import](features/cosense-import/requirements.md)
- Posting into an existing Mastodon or Misskey
- Visual design and the choice of an ORM

## Background and problems

### Background

[archives.yamanoku.net](https://archives.yamanoku.net/) is a static archive of yamanoku's past articles, generated with Astro. On 2026-11-01 the page described itself as a collection of past articles and logs, and said the contents are not updated except for link repairs made during the migration. This product does not extend that archive. Reading and feeds fit that static site. Static files cannot hold an inbox, signatures, or delivery to followers. They also cannot take updates from both a browser and a CLI.

[The Cosense project yamanoku](https://scrapbox.io/yamanoku/) already stores pages linked by title. On 2026-11-01 the project page listed those titles as links. Cosense does not provide this host's ActivityPub actor, remote follow, or a write path limited to the owner. The product does not keep Cosense as the canonical body.

### Problems to solve

The owner keeps articles, short posts, bookmarks, and linked notes in different places. The static archive cannot accept a remote follow, and it cannot take writes from both a browser and a CLI. Cosense pages can be followed by title, and they are not published as this host's actor.

A reader without an account has no place on this host to read public entries and follow their titles. There is also no place to subscribe to a human-readable feed.

A remote ActivityPub instance has no actor `acct:yamanoku@weblog.yamanoku.net` to follow. It also cannot receive the public entries this host delivers.

## Target users

### Owner yamanoku

- **Characteristics:** The only person who writes on this host. Uses a browser and a CLI. Moves the created Cosense pages named by the import requirements onto this host.
- **Problems:** Articles and linked pages live in different places. No single host offers remote follow and writes limited to the owner.
- **Usage context:** Creates, updates, publishes, and deletes entries. Moves the created pages named by the import requirements onto this host. After that move, the owner does not update the public Cosense project. A program can call the same write path with the owner's CLI credential.

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
- **Offering:** Keep the new cost of running the app at zero yen, and allow the runtime parts to be replaced later. The items the owner can take out, and the rule that storage is acceptable only when those items can be restored, are in [Relocation](features/relocation/requirements.md).
- **Reason:** The owner named Cloudflare's free tier as the first place to run the app, and asked for those parts to be removable. Domain registration fees paid to a registry are outside the zero-yen target. So is the part of the existing Gyazo archive storage that exceeds 10 GB a month.

## Definition of success

The product is successful when all of the following hold.

- The owner can publish articles, short posts, and bookmarks to weblog.yamanoku.net from the browser and the CLI. The owner can also move the created pages named by the import requirements onto the same host.
- A person who is not logged in can read public entries and follow title links in both directions. They can also read the human-readable feeds.
- A remote instance can follow `acct:yamanoku@weblog.yamanoku.net` and receive the public entries this host delivers.
- Pages brought in from Cosense stay out of the human-readable feeds until the owner changes their kind. They also stay out of remote delivery.
- The new cost of running the app is zero yen. Work past the free allowance fails or waits until 00:00 UTC the next day. The app does not move itself onto a paid plan.

## Development principles

- The only writer is the owner. There is no registration API.
- The canonical body is plain text. HTML for display is produced from that text.
- After publication, the hostname and the published ActivityPub identifiers stay unchanged. Changing the hostname breaks the `acct:` and object identifiers that remote servers have stored. The DNS provider can be replaced while the hostname's HTTPS still resolves to this app.
- A custom domain is attached to a zone on the Free plan. The [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) page, updated 2026-10-02, does not list an extra fee. The [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) page, updated 2026-10-29, does not list an extra fee either. The cap is 100 custom domains per zone. The zone stays on the Free plan. A Pro zone plan, or a higher zone plan, is not contracted.
- Entry rules stay free of a Cloudflare SDK. Runtime parts remain replaceable.
- Staying at zero yen for new runtime cost comes before continuing work that no longer fits the free allowance. That work fails or waits until 00:00 UTC the next day. The app does not move itself onto a paid plan.
- Do not contract Workers Paid at the start. That plan costs 5 dollars a month even when it is not used. The source is the [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) page, updated 2026-10-02. Do not contract it before measurement either.
- When creating or checking an HTTP signature exceeds the free CPU time for one invocation, reduce that work and keep running on the free tier. Do not contract a paid plan for this reason. Until the work fits, do not run it.
- The D1 free allowance includes 5 million row reads a day and 5 GB of storage for the account. The source is the D1 table on that same Workers pricing page, updated 2026-10-02.
- Domain registration fees are outside the zero-yen target. So is existing Gyazo archive storage beyond 10 GB a month.
- Pages brought in from Cosense are not classified automatically into articles, short posts, or bookmarks. They are not delivered to followers in bulk.
- The public URL and the activity ID are fixed in this version. Adding the federation contract later would change the host after publication. Implementation order is not a separate decision.
- Do not post this host's entries into an existing Mastodon or Misskey server. Remote follow could be met that way. Articles, bookmarks, and bidirectional links to titles that do not exist yet cannot be produced from one line of text.
- This purpose does not choose a UI framework or an ORM.

## SLA, SLI, and SLO

### SLA

None. The product does not promise availability to readers or to remote instances. It also does not promise a delivery time. Work past the free allowance fails or waits until the next day. The app does not move itself onto a paid plan. The owner decided this. A promise of availability would require paid capacity that this product does not buy.

### SLI and SLO

No numeric target. The operating rule is to fail or wait when the free allowance is used up, not to hit an availability percentage. The product also sets no percentage target for delivery success.

Whether creating or checking HTTP signatures fits the free CPU time for one invocation has not been measured. That lack of a measurement is not a current SLO. The handling when the work exceeds that time is the development principle above.

## Open questions

Which frontend framework to use is undecided. No product has been chosen. Until the owner chooses one, this purpose does not select a framework.

Which ORM library to use is undecided. No library has been chosen. The first store adapter is D1. An ORM that exceeds D1's 500 MB database size, the free daily row limits, or 50 queries per invocation is rejected. The owner chooses a library later only inside those limits, or chooses none.

The following are outside this purpose. Decide each one in the Requirements that own it. The undecided choice and the decided interim are written there.

- Rendering of Cosense notation other than links, in [Public reading](features/public-reading/requirements.md)
- The physical format of the export file, in [Relocation](features/relocation/requirements.md)

Do not change the purpose, the users, or the value.
