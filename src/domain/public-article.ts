import { isReservedTitle } from "./catalog.ts";

// The title path is the title with spaces written as underscores.
export function articlePathTitle(title: string): string {
  return title.replaceAll(" ", "_");
}

export function publicArticleHref(article: { id: string; title: string }): string {
  const path = articlePathTitle(article.title);
  if (path.length === 0 || isReservedTitle(path)) return "/e/" + article.id;
  return "/" + path;
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
