// Mock entries for the page map. This module does not import void, Svelte, or a store.

export type CatalogEntry = {
  id: string;
  title: string;
  kind: string;
  body: string;
  visibility: string;
  deliverable: boolean;
};

export const reservedTitles = [
  "e",
  "edit",
  "entries",
  "tokens",
  "feed",
  "feed.xml",
  "feed.json",
  "pages",
  "users",
  "gyazo",
  ".well-known",
];

const reserved = new Set<string>(reservedTitles);

const entries: CatalogEntry[] = [
  {
    id: "entry-morning-note",
    title: "morning-note",
    kind: "article",
    body: "The plain text of the morning note.",
    visibility: "public",
    deliverable: true,
  },
  {
    id: "entry-short-post",
    title: "short-post",
    kind: "note",
    body: "A short public note.",
    visibility: "public",
    deliverable: true,
  },
  {
    id: "entry-saved-page",
    title: "saved-page",
    kind: "bookmark",
    body: "A bookmark the owner kept.",
    visibility: "public",
    deliverable: true,
  },
  {
    id: "entry-index-only",
    title: "index-only",
    kind: "page",
    body: "A public page that is not deliverable.",
    visibility: "public",
    deliverable: false,
  },
  {
    id: "entry-draft-thought",
    title: "draft-thought",
    kind: "note",
    body: "A draft that stays off the public pages.",
    visibility: "draft",
    deliverable: false,
  },
];

export function isReservedTitle(title: string): boolean {
  return reserved.has(title);
}

export function deliverableEntries(): CatalogEntry[] {
  return entries.filter((entry) => entry.deliverable);
}

export function publicEntries(): CatalogEntry[] {
  return entries.filter((entry) => entry.visibility === "public");
}

export function publicArticles(): CatalogEntry[] {
  return publicEntries().filter((entry) => entry.kind === "article");
}

export function publicEntryByTitle(title: string): CatalogEntry | null {
  return publicEntries().find((entry) => entry.title === title) ?? null;
}

export function entryById(id: string): CatalogEntry | null {
  return entries.find((entry) => entry.id === id) ?? null;
}
