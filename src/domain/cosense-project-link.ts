// A Cosense bracket that points at another project: [/project] or [/project/page title].

const lineAnchor = /^([\s\S]+)#([0-9a-fA-F]{24})$/;

// A trailing `#` plus a 24-hex Cosense line id is a fragment, not part of the page title.
export function splitLineAnchor(value: string): { title: string; lineId: string | null } {
  const match = lineAnchor.exec(value);
  const title = match?.[1];
  const lineId = match?.[2];
  if (!title || !lineId) return { title: value, lineId: null };
  return { title, lineId };
}

export type CosenseProjectLink = { label: string; href: string };

export function cosenseProjectLink(inner: string): CosenseProjectLink | null {
  if (!inner.startsWith("/")) return null;
  if (/^\/\*\s+\S/.test(inner) || /^\/\s+\S/.test(inner)) return null;
  const match = /^\/([A-Za-z0-9_-]+)(?:\/([\s\S]*))?$/.exec(inner);
  const project = match?.[1];
  if (!project) return null;
  const page = match?.[2];
  if (page === undefined || page.length === 0) {
    return { label: project, href: `https://scrapbox.io/${project}` };
  }
  if (page.includes("\n")) return null;
  const anchor = splitLineAnchor(page);
  const path = encodeURIComponent(anchor.title);
  const href = anchor.lineId
    ? `https://scrapbox.io/${project}/${path}#${anchor.lineId}`
    : `https://scrapbox.io/${project}/${path}`;
  return { label: page, href };
}

export function cosenseProjectMarkdown(inner: string): string | null {
  const link = cosenseProjectLink(inner);
  if (!link || link.label.includes("[") || link.label.includes("]")) return null;
  return `[${link.label}](${link.href})`;
}
