# Worker application design

[日本語](worker.ja.md)

## About this document

This design decides how one Worker hosts [weblog.yamanoku.net](../../products/weblog/product.md). The same Worker serves [owner writing](../../products/weblog/features/owner-writing/requirements.md), [public reading](../../products/weblog/features/public-reading/requirements.md), [ActivityPub](../../products/weblog/features/activitypub/requirements.md), and [Cosense import](../../products/weblog/features/cosense-import/requirements.md).

The owner chose [Void](https://void.cloud/) as that application. The owner did not choose a UI framework. React, Vue, Svelte, and Solid stay unchosen.

### Audience

People and agents implementing or changing this Worker.

### Prerequisites

The parent product and the requirements linked above. Void is a full-stack framework for Cloudflare Workers, powered by Vite.

### Outside this document

- Which UI framework to use. The product leaves that unchosen.
- Which ORM to use. The first store adapter stays D1.
- Entry validation, public HTML rules, federation behavior, and the import walk. Those stay in the requirements linked above.
- The owner CLI. It stays a separate process that calls this Worker.

## Implementation approach

The deliverable is one Void application on one Cloudflare Worker. There is no second Worker.

[Quickstart](https://void.cloud/guide/quickstart) creates the app with the `void` package and `void init`, then deploys it. That page asks for a UI framework, a starter, and a deployment target. This design answers the target and the shape. It does not answer the UI framework. The target is the owner's Cloudflare account. The shape is the API-only Void app: `routes/`, and no frontend package. [Supported App Types](https://void.cloud/guide/app-types) describes that shape as routes without a frontend.

[Pages Routing](https://void.cloud/guide/pages-routing/overview) starts when a `pages/` directory exists. Page components run on the server for the first render and in the browser for later navigation. The adapters are `@void/react`, `@void/vue`, `@void/svelte`, and `@void/solid`. This app does not use Pages mode. Public pages stay server-rendered HTML, and there is no client-side application. The edit screen stays an HTML form.

A route handler is the HTTP entrance. [Server Routing](https://void.cloud/guide/server-routing) says Void uses Hono for routing and middleware. The handler calls the domain and returns that result. The domain does not import `void`, `void/db`, Hono, a UI framework, an ORM, Fedify, or the Cloudflare SDK. The adapter does not use Fedify.

The store adapter uses the bare D1 binding. It does not import `void/db`. [Database](https://void.cloud/guide/database) says `void/db` is Drizzle. The ORM stays unchosen, so the adapter does not take that import. [D1](https://void.cloud/guide/database/d1) says a bare D1 binding reads from the primary, and that a call to `withSession()` is what uses a replica. The adapter does not call `withSession()`. The same page says Void enables read replication when it provisions a database. This app does not use that session.

Deploy with `void deploy --platform cloudflare`. [Deployment](https://void.cloud/guide/deployment) says native apps work on Workers Free within its quotas. Sandboxes require Workers Paid and Containers. This app does not use Sandboxes. It does not install a Void platform. [Prerequisites](https://void.cloud/guide/platform/installation/prerequisites) say Workers for Platforms requires its own paid plan. [Install a Void Platform](https://void.cloud/guide/self-hosted-platform) points an individual app at direct Cloudflare deploy instead.

[Cloudflare](https://void.cloud/integrations/cloudflare) shows an optional service binding to another Worker. This app does not add that binding.

## Architecture and sequence diagrams

No diagram. One request enters a Void route handler, then the feature that owns the route. A second picture would restate that entrance.

## Data model and ER diagrams

None. This design adds no table and no column. The first store adapter stays the one D1 database.

## APIs and interfaces

The interface is the Void route handler on this Worker. It does not add a path. The handler's input is the HTTP request the linked requirements already name. Its output is that feature's response. A handler that cannot call the domain returns that feature's failure status and stores nothing new.

The deploy command is `void deploy --platform cloudflare`. It publishes this one app to the owner's Cloudflare account.

## External service integration

Void deploys the app to the owner's Cloudflare account. The quickstart and the deployment page above are the sources. The account stays on Workers Free. The app does not contract Workers Paid, Workers for Platforms, or Sandboxes.

The D1 binding is the store. KV, the queue, and R2 stay the resources the linked requirements already use. This design does not add a database product. It does not import `void/db`.

## Data handling

This design adds no stored record. The route handler does not log the actor private key, the owner token, or an Access JWT. Those credentials stay with the features that already hold them.

## Authentication and authorization notes

None beyond the linked requirements. [Authentication](https://void.cloud/guide/auth) offers Void-managed email and password for a native Void app. This app does not enable it. Browser login stays the owner-writing requirement.

## Security considerations

The domain stays free of `void`, `void/db`, Hono, React, Vue, Svelte, Solid, an ORM, Fedify, and the Cloudflare SDK. The adapter does not use Fedify. When a handler needs the D1 binding or the Void entrance, that import stays in the adapter. The adapter does not import a UI framework, because no UI framework is chosen.

## Deployment notes

Publish with `void deploy --platform cloudflare`. Do not install a Void platform. Do not enable Sandboxes. Do not add a second Worker. The hostname stays `weblog.yamanoku.net`.

## Alternatives considered

### React, Vue, Svelte, or Solid

[renderToReadableStream](https://react.dev/reference/react-dom/server/renderToReadableStream) renders a React tree to a Web Stream. Omitting `bootstrapScripts` skips running React on the client. [Vue server renderer](https://vuejs.org/api/ssr.html) exports `renderToString` and `pipeToWebWritable`. The Vue page names Cloudflare Workers as an environment where `TransformStream` is available. [svelte/server](https://svelte.dev/docs/svelte/svelte-server) `render` returns HTML `head` and `body` on the server. [renderToString](https://docs.solidjs.com/reference/rendering/render-to-string) renders Solid HTML on the server and includes hydration markup. Solid's [Cloudflare guide](https://docs.solidjs.com/guides/deployment-options/cloudflare) deploys a `dist` directory with `wrangler pages deploy`, which is static Pages output.

Any of the four could sit in a render adapter and avoid the domain. None of those pages requires Workers Paid. The owner did not choose one. Pages mode would also run the chosen library in the browser, and this product has no client-side application. The edit screen stays an HTML form.

### SvelteKit as the Worker

[adapter-cloudflare](https://svelte.dev/docs/kit/adapter-cloudflare) builds a Worker whose `main` is `.svelte-kit/cloudflare/_worker.js`, with an assets binding. That would make SvelteKit the Worker entry. The owner chose a Void app instead.

### `void/db` and Drizzle

`void/db` would give typed queries, and the Database page says Void includes Drizzle. The ORM is still unchosen. The first store adapter stays the D1 binding. The domain does not import an ORM, and this adapter does not import `void/db`.

### A Void platform

A platform adds shared access and retained deployment history. The prerequisites page says Workers for Platforms requires its own paid plan. This product does not contract that plan. An individual app deploys to the owner's Cloudflare account.

### Sandboxes

Sandboxes are a Void runtime for isolated execution. The deployment page says they require Workers Paid and Containers. This app does not use them.

### A hand-written Worker entry

A Worker with no application framework avoids the `void` package. The routes would still be one Worker, and the domain boundary would be the same. The owner chose Void, so the entrance is the Void route handler.

## Open questions

Which UI framework to use is undecided. No UI product has been chosen. Until the owner chooses one, this app does not import React, Vue, Svelte, or Solid, does not add `pages/`, and does not run a client-side application. The edit screen stays an HTML form.

Which ORM to use is undecided. This design does not choose `void/db` or Drizzle.
