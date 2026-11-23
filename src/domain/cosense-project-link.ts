// A Cosense bracket that points at another project: [/project] or [/project/page title].

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
  return {
    label: page,
    href: `https://scrapbox.io/${project}/${encodeURIComponent(page)}`,
  };
}

export function cosenseProjectMarkdown(inner: string): string | null {
  const link = cosenseProjectLink(inner);
  if (!link || link.label.includes("[") || link.label.includes("]")) return null;
  return `[${link.label}](${link.href})`;
}
