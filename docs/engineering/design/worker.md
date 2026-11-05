# Worker application design

[日本語](worker.ja.md)

## About this document

This design decides how one Worker hosts [weblog.yamanoku.net](../../products/weblog/product.md). The same Worker serves [owner writing](../../products/weblog/features/owner-writing/requirements.md), [public reading](../../products/weblog/features/public-reading/requirements.md), [ActivityPub](../../products/weblog/features/activitypub/requirements.md), and [Cosense import](../../products/weblog/features/cosense-import/requirements.md).

The owner chose [Void](https://void.cloud/) as that application. The owner chose Svelte as the UI framework. React, Vue, and Solid stay unchosen. SvelteKit does not own this Worker.

### Audience

People and agents implementing or changing this Worker.

### Prerequisites

The parent product and the requirements linked above. Void is a full-stack framework for Cloudflare Workers, powered by Vite.

### Outside this document

- Entry validation, public HTML rules, federation behavior, and the import walk. Those stay in the requirements linked above.
- The owner CLI. It stays a separate process that calls this Worker.

## Implementation approach

The deliverable is one Void application on one Cloudflare Worker. There is no second Worker.

[Quickstart](https://void.cloud/guide/quickstart) creates the app with the `void` package and `void init`, then deploys it. That page asks for a UI framework, a starter, and a deployment target. This design answers those with Svelte, Pages mode, and the owner's Cloudflare account.

[Pages Routing](https://void.cloud/guide/pages-routing/overview) starts when a `pages/` directory exists. It can live alongside `routes/`. Page components normally run on the server for the first render and in the browser for later navigation and interaction. The first request receives rendered HTML. Later navigations run the loader and update the page without reloading the document. This app uses that mode. The screen adapter is `@void/svelte`, and the Vite plugin is `voidSvelte()` from `@void/svelte/plugin`. The same page shows `@void/react`, `@void/vue`, and `@void/solid`. This app does not install those. Public HTML pages and the edit screen live under `src/pages/`. HTTP that is not a page stays under `src/routes/`. This app does not export `ssr = false`. That export returns a client-mounted shell instead of server-rendered component HTML. The same page's table is the source for that row.

Void `sourceDir` is `src`. Application source, including `pages/`, `routes/`, `middleware/`, and `db/`, lives under that directory. `void.config.ts`, `vite.config.js`, and `package.json` stay at the repository root. `npm run dev`, `npm run build`, and deploy run from that root and read `src/`.

[Server Routing](https://void.cloud/guide/server-routing) says Void uses Hono for routing and middleware. A route handler calls the domain and returns that result. The domain does not import `void`, `void/db`, Hono, Svelte, `@void/svelte`, an ORM, Fedify, or the Cloudflare SDK. Page files import Svelte through `@void/svelte`. The federation adapter does not use Fedify.

The store adapter queries through `db` from `void/db` on the D1 binding. [Database](https://void.cloud/guide/database) says `void/db` is Drizzle. [D1](https://void.cloud/guide/database/d1) says those queries use a D1 session for each Void request, so reads can run near the request and later queries in that request see at least the same data. The same page says replicas can lag between requests, and that Void enables read replication when it provisions a database. The domain does not import `void/db`. Page files do not import it either.

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

The D1 binding is the store. The store adapter imports `void/db`. KV, the queue, and R2 stay the resources the linked requirements already use. This design does not add a database product.

## Data handling

This design adds no stored record. The route handler does not log the actor private key, the owner token, or an Access JWT. Those credentials stay with the features that already hold them.

## Authentication and authorization notes

None beyond the linked requirements. [Authentication](https://void.cloud/guide/auth) offers Void-managed email and password for a native Void app. This app does not enable it. Browser login stays the owner-writing requirement.

## Security considerations

The domain stays free of `void`, `void/db`, Hono, Svelte, `@void/svelte`, Fedify, and the Cloudflare SDK. The store adapter imports `void/db`. Page files import Svelte through `@void/svelte`. The federation adapter does not use Fedify. When a handler needs the D1 binding or the Void entrance, that import stays in the adapter. The store adapter does not import Svelte.

## Deployment notes

Publish with `void deploy --platform cloudflare` from the repository root. The command reads application source from `src/`. Do not install a Void platform. Do not enable Sandboxes. Do not add a second Worker. The hostname stays `weblog.yamanoku.net`.

## Alternatives considered

### React, Vue, or Solid

[renderToReadableStream](https://react.dev/reference/react-dom/server/renderToReadableStream) renders a React tree to a Web Stream. Omitting `bootstrapScripts` skips running React on the client. [Vue server renderer](https://vuejs.org/api/ssr.html) exports `renderToString` and `pipeToWebWritable`. The Vue page names Cloudflare Workers as an environment where `TransformStream` is available. [renderToString](https://docs.solidjs.com/reference/rendering/render-to-string) renders Solid HTML on the server and includes hydration markup. Solid's [Cloudflare guide](https://docs.solidjs.com/guides/deployment-options/cloudflare) deploys a `dist` directory with `wrangler pages deploy`, which is static Pages output.

Any of the three could sit in a render adapter and avoid the domain. None of those pages requires Workers Paid. The owner chose Svelte. This app does not install `@void/react`, `@void/vue`, or `@void/solid`.

### SvelteKit as the Worker

[adapter-cloudflare](https://svelte.dev/docs/kit/adapter-cloudflare) builds a Worker whose `main` is `.svelte-kit/cloudflare/_worker.js`, with an assets binding. That would make SvelteKit the Worker entry. The owner kept Void as the entry and chose Svelte as the screen. This app does not install `@sveltejs/adapter-cloudflare`.

### A bare D1 binding

A bare D1 binding reads from the primary. The D1 page says other query libraries need their own `withSession()` call to use a replica. The owner chose `void/db`, so the adapter uses that library's session for each Void request. The domain still does not import `void/db`.

### A Void platform

A platform adds shared access and retained deployment history. The prerequisites page says Workers for Platforms requires its own paid plan. This product does not contract that plan. An individual app deploys to the owner's Cloudflare account.

### Sandboxes

Sandboxes are a Void runtime for isolated execution. The deployment page says they require Workers Paid and Containers. This app does not use them.

### A hand-written Worker entry

A Worker with no application framework avoids the `void` package. The routes would still be one Worker, and the domain boundary would be the same. The owner chose Void, so the entrance is the Void route handler.

## Open questions

None that block this Worker.
