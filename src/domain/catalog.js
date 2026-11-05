// Mock entries for the page map. This module does not import void, Svelte, or a store.

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

const reserved = new Set(reservedTitles);

const entries = [
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

export function isReservedTitle(title) {
  return reserved.has(title);
}

export function deliverableEntries() {
  return entries.filter((entry) => entry.deliverable);
}

export function publicEntries() {
  return entries.filter((entry) => entry.visibility === "public");
}

export function publicEntryByTitle(title) {
  return publicEntries().find((entry) => entry.title === title) ?? null;
}

export function entryById(id) {
  return entries.find((entry) => entry.id === id) ?? null;
}
