# Backend packages

[日本語](backend.ja.md)

## About this document

This design records the backend packages for [weblog.yamanoku.net](../../products/weblog/product.md). The product already chooses `void/db` as the ORM and keeps D1 as the first store. Writes stay in [owner writing](../../products/weblog/features/owner-writing/requirements.md). Federation stays in [ActivityPub](../../products/weblog/features/activitypub/requirements.md).

### Audience

People and agents adding the store and route packages.

### Prerequisites

The product principle that the ORM is `void/db` and the first store adapter stays D1. One `void` application serves this host.

### Outside this document

- Screen packages. Svelte and `@void/svelte` stay the screen list.
- Path assignment, feed documents, and edit fields.
- Visual design.

## Implementation approach

The ORM is `void/db`. The store adapter imports `db` from `void/db` on the D1 binding. `void/db` is an export of the `void` package. It is not a second package name. [Database](https://void.cloud/guide/database) re-exports Drizzle query operators from `void/db` and says the app does not need to install `drizzle-orm` separately. Schema helpers ship inside `void`. D1 tables are not a reason to install `drizzle-orm`.

The first store stays D1. This app does not install `drizzle-orm` separately.

Void route handlers run on Hono inside the `void` package. [Hono](https://void.cloud/integrations/hono) says Void depends on Hono internally, and that the app adds the `hono` package only when the app imports `hono/*` directly. This app does not import `hono/*`. It does not add `hono`.

The domain does not import `void/db`, Hono, Fedify, or the Cloudflare SDK. This document does not name an npm package for that SDK. Page files do not import `void/db`. The federation adapter does not use Fedify. The owner chose a hand-rolled signer.

Versions are unpinned. The objects below omit version fields.

This app's backend package is:

```json
{
  "dependencies": {
    "void": null
  }
}
```

That object is the backend list. It does not replace the screen list, which still names `svelte` and `@void/svelte`.

## Architecture and sequence diagrams

No diagram. One package name is the decision. A picture would restate `void`.

## Data model and ER diagrams

None. This design adds no table and no column. D1 remains the store.

## APIs and interfaces

A route handler calls the domain. The store adapter is the only caller of `db` from `void/db`. The domain passes the change list. The adapter runs the batch.

## External service integration

None added here. D1, KV, the queue, and R2 stay the resources the requirements already use. They are not new npm dependencies.

## Data handling

The store adapter reads and writes D1 through `void/db`. Page files do not read D1.

## Authentication and authorization notes

None. This app does not enable Void-managed login. Browser login stays with owner writing.

## Security considerations

The domain stays free of `void/db`, Hono, Fedify, and the Cloudflare SDK. The store adapter imports `void/db`. The federation adapter does not import Fedify.

## Deployment notes

None. Publishing stays one `void` app on the owner's Cloudflare account. The hostname stays `weblog.yamanoku.net`.

## Alternatives considered

These packages were considered. They are not dependencies of this app. Versions are unpinned. The object omits version fields.

```json
{
  "considered": {
    "drizzle-orm": null,
    "hono": null,
    "fedify": null
  }
}
```

### A separate Drizzle install

Installing `drizzle-orm` would repeat operators that `void/db` already re-exports. The store stays `db` from `void/db`. `drizzle-orm` is not a dependency.

### A direct `hono` dependency

Handlers already run on Hono inside `void`. A direct `hono` dependency is for an app that imports `hono/*`. This app does not. Routing still uses Hono. `hono` is not a dependency.

### Fedify

Fedify would be a federation library in the adapter. The federation adapter does not use Fedify. `fedify` is not a dependency.

### A bare D1 binding

A bare D1 binding would read the primary without `void/db`. The owner chose `void/db`, so the store adapter imports `db` from that export. A bare binding is not a package and is not the store.

## Open questions

None that block these packages.
