# Install

[日本語](requirements.ja.md)

## About this document

An unauthenticated visitor can install this host as an app. The parent product is [weblog.yamanoku.net](../../product.md). Reading a public entry stays in [Public reading](../public-reading/requirements.md).

### Scope

- A web app manifest linked from every HTML page
- That manifest, fetched with no owner credential
- A 192px icon and a 512px icon, fetched with no owner credential
- A start URL that opens the public home
- No service worker

### Out of scope

- Offline reading, a cache, push, and background sync
- An install button on the page, and the operating-system install dialog
- A new visual system. The icons repeat the mark already drawn in the page header
- The browser-extension manifest in `packages/clip`
- Who may read or write, feeds, ActivityPub, and the edit flow. Those stay in the features that already own them

## User stories

### Install the public site

As a visitor who is not logged in, I want this host to expose an installable app so that I can open the public home from an installed app.

**Acceptance criteria:**

Scenario: When a visitor opens an HTML page, the document links the manifest

- Given: The visitor has no owner credential.
- When: The visitor requests an HTML page on this host.
- Then: The response is that page's HTML. The document links a web app manifest with `rel="manifest"`. The response is not a login page.

Scenario: When a visitor fetches the linked manifest, the document meets the install members

- Given: The visitor has no owner credential. The manifest URL is the one the HTML page links.
- When: The visitor fetches that URL.
- Then: The response parses as JSON. It is not an HTML error and not an authentication challenge. It has `name` or `short_name`. `start_url` is inside `scope`. `display` or `display_override` is `standalone`, `fullscreen`, `minimal-ui`, or `window-controls-overlay`, and is not `browser`. `prefer_related_applications` is absent or false. `icons` includes a 192px icon and a 512px icon whose `purpose` includes `any` or is omitted.

Scenario: When a visitor fetches a required icon, the bytes match the declared size

- Given: The visitor has no owner credential. The manifest names a 192px icon and a 512px icon.
- When: The visitor fetches each of those icon URLs.
- Then: Each response is image bytes of type PNG, WebP, or SVG. A PNG or WebP has the raster width and height the manifest declares. An SVG is a non-empty SVG document. The body is not HTML and not JSON.

Scenario: When a visitor opens the start URL, the public home is returned

- Given: The visitor has no owner credential. The manifest `start_url` is on this host and inside `scope`.
- When: The visitor requests that start URL.
- Then: The response is the public home, the list of deliverable entries. It is not a login page and not an edit page.

Scenario: When a title would use the manifest path, the manifest stays the manifest

- Given: A title's comparison key is the manifest path.
- When: An unauthenticated client requests that path.
- Then: The response is the manifest document. That title has no view path. The title remains at its canonical URL.

## KPIs

### No numeric target

The parent product sets no percentage target. This feature is accepted or rejected by the acceptance criteria above. The browser's choice to show an install dialog is not a target.

- **Current value:** None, because the feature is new
- **Target value:** None
- **Measurement method:** None
- **Measurement period:** None

## Functional requirements

### Link the manifest

**Overview:** Every HTML page points at one manifest. The first HTML response includes the link. A later move between HTML pages on this host keeps the link.

**Input:** A request for an HTML page, with or without an owner credential.

**Output:** That page's HTML, including `rel="manifest"`.

#### Applicable conditions

##### One manifest URL

The linked URL is on this host. It is the same URL on every HTML page. It is not the browser-extension manifest.

#### Exceptional behavior

##### A response that is not an HTML page

Feeds, image bytes, and Activity Streams documents do not gain this link. Their bodies stay the documents those features already return.

### Serve the manifest and the icons

**Overview:** The manifest and the two required icons are public documents. No owner credential is required. Sending a credential does not replace them with an edit page.

**Input:** GET of the manifest URL, or GET of an icon URL named by that manifest.

**Output:** The manifest JSON, or the icon bytes.

#### Applicable conditions

##### Manifest members

The manifest has `name` or `short_name`. `start_url` resolves to `/`, the public home, and lies inside `scope`. `scope` is `/`. `display` is `standalone`. `prefer_related_applications` is absent. `icons` names a 192px PNG and a 512px PNG. Each icon's `purpose` includes `any`.

##### Icon bytes

Each required icon is a PNG whose width and height equal the size named in the manifest. The picture is the mark already drawn in the page header.

#### Exceptional behavior

##### A credential on the request

An owner cookie or an Access header does not change the manifest or the icon bytes. The edit gate stays the gate owner writing already applies to edit URLs.

## Data requirements

### Required data

- **Web app manifest:** The public description of the installable app: name, start URL, scope, display mode, and the icon URLs. This feature does not store it in the entry database.
- **Icons:** The header mark at 192px and at 512px. This feature does not store them as entries.

### Relationships

One manifest names the two icons. `start_url` refers to the public home. The manifest does not refer to an entry id.

### Personal information

None. The manifest and the icons name the site. They do not name a reader.

## External service dependencies

None. The documents are served by the existing Worker. This feature adds no paid Cloudflare product and no second Worker.

## Security considerations

The manifest and the icons are readable without a credential. They contain no token and no private entry. Publishing them does not open the edit URLs.

## Open questions

None. Whether a browser shows its install dialog depends on that browser's own engagement rules. This feature does not decide that dialog.
