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

// A public article is shown at /{title} when that path is its title path.
export function publicArticleMatchesPath(title: string, pathTitle: string): boolean {
  return articlePathTitle(title) === pathTitle;
}
