// One page of the public home list. The first page omits the query.

export const homePageSize = 12;

export function parseHomePage(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return 1;
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  const page = Number(raw);
  if (!Number.isSafeInteger(page)) return null;
  return page;
}

export function homePageCount(total: number, size = homePageSize): number {
  if (total <= 0) return 1;
  return Math.ceil(total / size);
}

export function homePageHref(page: number): string {
  return page <= 1 ? "/" : `/?page=${page}`;
}

export function homePageSlice<T>(entries: readonly T[], page: number, size = homePageSize): T[] {
  const start = (page - 1) * size;
  return entries.slice(start, start + size);
}

// Seven pages or fewer show every number. A longer list shows the ends and the current neighbors.
export function homePageNumbers(page: number, pageCount: number): Array<number | "gap"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const keep = new Set<number>([1, pageCount]);
  for (const number of [page - 1, page, page + 1]) {
    if (number >= 1 && number <= pageCount) keep.add(number);
  }
  const sorted = [...keep].sort((left, right) => left - right);
  const items: Array<number | "gap"> = [];
  for (const number of sorted) {
    const previous = items.at(-1);
    if (typeof previous === "number" && number - previous > 1) items.push("gap");
    items.push(number);
  }
  return items;
}
