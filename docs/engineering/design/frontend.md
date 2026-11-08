# Frontend packages

[日本語](frontend.ja.md)

## About this document

This design records the screen packages for [weblog.yamanoku.net](../../products/weblog/product.md). The product already chooses Svelte. Public HTML and the edit screen stay in [owner writing](../../products/weblog/features/owner-writing/requirements.md) and [public reading](../../products/weblog/features/public-reading/requirements.md).

### Audience

People and agents adding the screen packages.

### Prerequisites

The product principle that the UI framework is Svelte. One Worker serves this host. SvelteKit does not own that Worker.

### Outside this document

- Path assignment, feed documents, and the edit form fields. Those stay in the requirements linked above.
- The ORM, the store, and federation signing.
- Visual design.

## Implementation approach

The screen is Svelte. Page files import Svelte through `@void/svelte`. The Vite plugin is `voidSvelte()` from `@void/svelte/plugin`. That path is an export of the `@void/svelte` package. It is not a second package name. The Worker application package is `void`. The app does not export `ssr = false`. [Pages Routing](https://void.cloud/guide/pages-routing/overview) says that export returns a client-mounted shell instead of server-rendered component HTML.

Versions are unpinned. The objects below omit version fields.

This app's packages are:

```json
{
  "dependencies": {
    "svelte": null,
    "@void/svelte": null,
    "void": null,
    "yama-normalize": null
  }
}
```

The domain does not import `void`, Svelte, or `@void/svelte`. Page files do not import `void/db`. The layout imports `yama-normalize`. That stylesheet is the default style for every page.

## Architecture and sequence diagrams

No diagram. One package list is the decision. A picture would restate those four names.

## Data model and ER diagrams

None. This design adds no table and no column.

## APIs and interfaces

The screen interface is the Svelte page. Its first response is HTML. Later navigation on this host runs in the browser. `ssr = false` stays unset.

## External service integration

None. These packages do not add a paid runtime.

## Data handling

None. Page files do not read D1.

## Authentication and authorization notes

None. Login stays with owner writing.

## Security considerations

Page files may import `@void/svelte`. The domain stays free of that import.

## Deployment notes

None. Publishing stays `void deploy --platform cloudflare` for the `void` package. The hostname stays `weblog.yamanoku.net`.

## Alternatives considered

These packages were considered. They are not dependencies of this app. Versions are unpinned. The object omits version fields.

```json
{
  "considered": {
    "@void/react": null,
    "@void/vue": null,
    "@void/solid": null,
    "@sveltejs/adapter-cloudflare": null
  }
}
```

### React, Vue, or Solid

[Pages Routing](https://void.cloud/guide/pages-routing/overview) shows `@void/react`, `@void/vue`, and `@void/solid`. The owner chose Svelte. This app does not install those three packages. React, Vue, and Solid are not the screen.

### SvelteKit as the Worker

[adapter-cloudflare](https://svelte.dev/docs/kit/adapter-cloudflare) builds a Worker whose `main` is `.svelte-kit/cloudflare/_worker.js`. That package would make SvelteKit the Worker entry. The entry stays the `void` package. SvelteKit is not the screen. This app does not install `@sveltejs/adapter-cloudflare`.

## Open questions

None that block these packages.
