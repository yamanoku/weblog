# Page map

[日本語](pages.ja.md)

## About this document

This design assigns each HTTP path of [weblog.yamanoku.net](../../products/weblog/product.md) to a Svelte page or to a route that is not a page. The behavior of each path stays in [owner writing](../../products/weblog/features/owner-writing/requirements.md), [public reading](../../products/weblog/features/public-reading/requirements.md), and [ActivityPub](../../products/weblog/features/activitypub/requirements.md). [Cosense import](../../products/weblog/features/cosense-import/requirements.md) adds no path on this host.

### Audience

People and agents implementing or changing these paths.

### Prerequisites

The requirements linked above. One Void application serves this host. The screen library is Svelte. Public HTML and the edit screen run in the browser after the first HTML response.

### Outside this document

- Field validation, feed documents, empty-page HTML, and draft rules. Those stay in the requirements linked above.
- Federation signatures, the queue, and the activity document body. Those stay in the ActivityPub requirements.
- The owner CLI. It calls this host and has no page here.
- Visual design.

## Implementation approach

The deliverable is one map for the paths the requirements already name. This design adds no path.

[Pages Routing](https://void.cloud/guide/pages-routing/overview) starts when a `pages/` directory exists. It can live alongside `routes/`. The first request for a page receives rendered HTML. Later navigation on this host runs the loader and updates the page without reloading the document. Public HTML and the edit screen use that mode. The screen adapter is `@void/svelte`. This app does not export `ssr = false`. Void `sourceDir` is `src`, so those directories are `src/pages/` and `src/routes/`. `npm run dev`, `npm run build`, and deploy run from the repository root. `void.config.ts`, `vite.config.ts`, and `package.json` stay there.

A path whose response is not an HTML page stays under `src/routes/`. Feeds, image bytes, Activity Streams, and the owner JSON API are those paths. A loader calls the domain and returns props. An action calls the same write operation as the CLI. The domain does not import Svelte or `void/db`. Page files do not import `void/db`.

The Worker matches a fixed path before a title path. A title is one path segment. Owner writing reserves these comparison keys, so a title does not take their URL: `e`, `edit`, `entries`, `tokens`, `feed`, `feed.xml`, `feed.json`, `pages`, `users`, `gyazo`, and `.well-known`.

## Architecture and sequence diagrams

No diagram. The tables below are the map. A second picture would repeat the same paths.

## Data model and ER diagrams

None. This design adds no table and no column.

## APIs and interfaces

The host in every absolute URL is `https://weblog.yamanoku.net`. The request Host header does not change it.

### Svelte pages

These files live under `src/pages/`. The first response is HTML. After that, a move to another page in this table runs in the browser and does not replace the whole document. A direct request still returns the status the linked requirements name.

| Path | Role |
| --- | --- |
| `GET /` | HTML list of deliverable entries. A later page uses `before` and `before_id` on this path. |
| `GET /pages` | HTML list of public titles. A later page uses the same cursor shape. |
| `GET /{title}` | Public entry HTML, or the empty page when the requirements say so. |
| `GET /e/{id}` | HTML for the canonical URL when the request is not the Activity Streams case below. |
| `GET /edit` | Create form, and the owner's articles, including drafts. |
| `GET /edit/{id}` | Edit form for that entry. |
| `POST /edit` | Create. |
| `POST /edit/{id}` | Update. |
| `POST /edit/tokens` | Issue or reissue the CLI token from the browser. |

An old public title path redirects as owner writing and public reading require. The target is the current view path, or the canonical URL when the entry has no view path. A draft is not that target.

### Routes that are not pages

These handlers live under `routes/`. They are outside the browser move between Svelte pages.

| Path | Role |
| --- | --- |
| `GET /feed.xml` | Atom for every deliverable entry. |
| `GET /feed.json` | JSON Feed for the same entries. |
| `GET /feed/articles.xml` | Atom for articles. |
| `GET /feed/notes.xml` | Atom for notes. |
| `GET /feed/bookmarks.xml` | Atom for bookmarks. |
| `GET /gyazo/{imageId}.{extension}` | Image bytes. `GET /gyazo` with no image id is not this route. |
| `GET /e/{id}` | The Activity Streams object when Accept asks for Activity Streams and accepts neither HTML nor `*/*`. |
| `GET /.well-known/webfinger` | Resolve this account. |
| `GET /users/yamanoku` | The actor document. |
| `GET /users/yamanoku/outbox` | Delivered activities. |
| `GET /users/yamanoku/followers` | Current followers. |
| `GET /users/yamanoku/s/{uuid}` | One activity document. This path has no HTML page. |
| `POST /users/yamanoku/inbox` | Inbox. |
| `POST /inbox` | The same inbox. GET on either inbox is 405. |
| `POST /entries` | CLI create. |
| `GET /entries` | The owner's list. |
| `GET /entries/{id}` | The owner's get-one. |
| `POST /tokens` | Reissue a token with a Bearer token. |

Feed cursors stay on the feed path. There is no per-kind JSON Feed. A page entry stays out of the feeds until the owner changes its kind.

`GET /e/{id}` is one URL. The Activity Streams Accept check runs before the Svelte page. The HTML page does not render the activity document.

## External service integration

None added here. Cloudflare Access, D1, and remote inboxes stay with the requirements that already use them.

## Data handling

This design adds no stored record. A page receives props from its loader. It does not read D1.

## Authentication and authorization notes

Access covers `/edit` and `/edit/*` only. Public HTML, feeds, WebFinger, both inboxes, and `/entries` stay outside that login. The credentials for each path stay in the requirements linked above.

## Security considerations

Page files import Svelte through `@void/svelte`. They do not import `void/db`, the Cloudflare SDK, or Fedify. A route handler calls the domain. The domain does not import Svelte.

## Deployment notes

None. Publishing this app does not add a path and does not change the hostname.

## Alternatives considered

### Serve feeds from Svelte pages

A feed URL would then be a page in the browser. Public reading requires Atom and JSON Feed documents, and image bytes, on those paths. Those responses stay under `src/routes/`.

### Keep the edit screen off `src/pages/`

The edit form would be a route with no browser move. Owner writing requires the edit screen to run in the browser after the first HTML. The form stays under `src/pages/`.

## Open questions

None that block this map.
