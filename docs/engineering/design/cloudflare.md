# Cloudflare services

[日本語](cloudflare.ja.md)

## About this document

This design lists the Cloudflare services [weblog.yamanoku.net](../../products/weblog/product.md) already plans to use, and the ones it does not. Writes stay in [owner writing](../../products/weblog/features/owner-writing/requirements.md). Public bytes stay in [public reading](../../products/weblog/features/public-reading/requirements.md). Delivery stays in [ActivityPub](../../products/weblog/features/activitypub/requirements.md). Import stays in [Cosense import](../../products/weblog/features/cosense-import/requirements.md). Moving the host stays in [relocation](../../products/weblog/features/relocation/requirements.md).

### Audience

People and agents provisioning this account.

### Prerequisites

The product rules for Workers Free, the custom domain, and the DNS provider. The requirements linked above.

### Outside this document

- Screen packages and backend package names.
- Path assignment and feed documents.
- Visual design.
- A billed size for the image bucket. Public reading leaves that unmeasured.

## Implementation approach

The app uses the services below. It adds no other Cloudflare product. It does not move itself onto a paid plan.

One Cloudflare Worker on Workers Free serves `weblog.yamanoku.net`. Publish with `void deploy --platform cloudflare`. There is no second Worker.

One Cron Trigger, `0 * * * *`, runs on that Worker for ActivityPub delivery. Cosense import registers no Cron Trigger. Relocation registers no Cron Trigger.

D1 is the one first store.

Workers KV binding `KEY_CACHE` holds short-lived remote public keys only. It is not the record of followers or jobs.

Queues binding `DELIVERY_QUEUE` carries delivery jobs.

The existing R2 bucket `gyazo-archives` is read and is not copied. Storage past 10 GB a month stays outside the zero-yen target. The bucket stays in use.

Cloudflare Access on the Zero Trust Free plan covers `/edit` and `/edit/*` only. Paid Access add-ons stay off.

A custom domain attaches to a zone on the Free plan. The DNS provider can still be replaced. The hostname's HTTPS still resolves to this app.

Workers Web Crypto is a runtime API of this Worker. It is not a second contracted product. The hand-rolled signer uses it.

## Architecture and sequence diagrams

No diagram. The list above is the account. A picture would restate the same names.

## Data model and ER diagrams

None. This design adds no table and no column.

## APIs and interfaces

None added. Each service keeps the binding or path the requirements already name.

## External service integration

The used services are the ones in the implementation approach. Quotas stay in the product and in the requirements linked above. This document adds no quota.

## Data handling

D1 holds the store. KV holds only the short-lived remote key. The queue carries job identifiers. R2 holds existing image bytes. The actor private key is a Worker secret, not a new product.

## Authentication and authorization notes

Version 1 browser login is Access. Passkey is not the browser login. Removing Access stays an open question in owner writing. Until the owner decides, Access stays.

## Security considerations

The domain does not import the Cloudflare SDK. The app does not rely on reading old Workers Logs. The unit price of Workers Logs after 2026-12-01 is not stated here. Logpush is not used.

## Deployment notes

None beyond the deploy command above. This document provisions nothing.

## Alternatives considered

### Workers Paid

The product does not contract Workers Paid at the start, and does not contract it before measurement. The app does not move itself onto a paid plan.

### Workers for Platforms

That product needs its own paid plan. This app deploys directly to the owner's account. It does not install a Void platform.

### Sandboxes and Containers

Sandboxes need Workers Paid and Containers. This app does not use them.

### A service binding to another Worker

An optional binding would call a second Worker. This app does not add it.

### Durable Objects

Workers Free can create one. This app does not. One person's data does not keep an object awake.

### GraphQL Analytics API

Cosense import checks its own tally. It does not call that API.

### Logpush

Delivery does not export logs. Logpush is not used.

### Cloudflare Pages

`wrangler pages deploy` would host a static Pages output. This app's host is the one Worker above. Pages is not that host.

### A Pro or higher zone plan

The custom domain stays on a Free-plan zone. A higher zone plan is not contracted.

### Paid Access add-ons

The Free plan covers the one owner seat. Paid add-ons stay off.

### Cloudflare DNS as a required provider

The DNS provider can be replaced. Cloudflare DNS is not required.

### Passkey as the browser login

Passkey is only a candidate for the time after Access. Version 1 does not adopt it.

## Open questions

The browser login after Access is removed stays open in owner writing. The Workers Logs unit price after 2026-12-01 stays unconfirmed. Neither blocks the list above.
