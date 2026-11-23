import { isReservedTitle } from "./catalog.ts";

const documentHost = "weblog.yamanoku.net";

// A missing entry has no title to show. An empty title uses the canonical URL.
export function publicDocumentTitle(entry: { title?: string | null; id?: string | null } | null): string {
  const title = entry?.title?.trim() ?? "";
  if (title.length > 0) return `${title} - ${documentHost}`;
  if (entry?.id) return `https://${documentHost}/e/${entry.id}`;
  return documentHost;
}

// The title path is the title with spaces written as underscores.
export function articlePathTitle(title: string): string {
  return title.replaceAll(" ", "_");
}

export function publicArticleHref(article: { id: string; title: string }): string {
  const path = articlePathTitle(article.title);
  if (path.length === 0 || isReservedTitle(path)) return "/e/" + article.id;
  return "/" + path;
}

// A missing title opens the article form with that path title already filled in.
export function missingTitleCreateHref(title: string): string {
  return `/new?title=${encodeURIComponent(title)}`;
}

// A public bookmark title opens the site URL. Other kinds stay on this host.
export function publicEntryHref(entry: {
  id: string;
  title: string;
  kind?: string;
  bookmarkUrl?: string | null;
}): string {
  const site = entry.kind === "bookmark" ? externalBookmarkHref(entry.bookmarkUrl) : null;
  if (site) return site;
  return publicArticleHref(entry);
}

export function externalBookmarkHref(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed;
  return null;
}

// A public article is shown at /{title} when that path is its title path.
export function publicArticleMatchesPath(title: string, pathTitle: string): boolean {
  return articlePathTitle(title) === pathTitle;
}
