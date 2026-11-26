// Home month and the same-day links under a dated diary.
// Asia/Tokyo is UTC+9 and has no daylight-saving transition.
// A Tokyo calendar date is turned into the UTC instants Date.toISOString() stores.

import type { SameDayLink } from "./same-day.ts";

export type { SameDayLink };

const isoInstant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const monthQuery = /^\d{4}-(0[1-9]|1[0-2])$/;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const canonicalOrigin = "https://weblog.yamanoku.net";

export type YearMonth = { year: number; month: number };

export type CalendarSource = {
  id: string;
  title: string;
  kind: string;
  visibility: string;
  viewPath: string | null;
  createdAt: string | null;
  inReplyToId: string | null;
};

export type CalendarDay = {
  date: string;
  day: number;
  href: string | null;
  accessibleName: string;
  current: boolean;
};

export function tokyoDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function parseHomeMonth(raw: string | undefined, now = new Date()): YearMonth | null {
  if (raw === undefined || raw === "") return yearMonth(tokyoDate(now));
  if (!monthQuery.test(raw)) return null;
  return { year: Number(raw.slice(0, 4)), month: Number(raw.slice(5, 7)) };
}

export function shiftMonth(month: YearMonth, delta: number): YearMonth {
  const shifted = new Date(Date.UTC(month.year, month.month - 1 + delta, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

export function monthHref(target: YearMonth, today: YearMonth): string {
  if (target.year === today.year && target.month === today.month) return "/";
  return `/?month=${padYear(target.year)}-${pad2(target.month)}`;
}

export function monthLabel(month: YearMonth): string {
  return `${month.year}年${month.month}月`;
}

export function monthDocumentTitle(month: YearMonth): string {
  return `${monthLabel(month)} - weblog.yamanoku.net`;
}

export function isRealDateTitle(title: string): boolean {
  if (!isoDate.test(title)) return false;
  const year = Number(title.slice(0, 4));
  const month = Number(title.slice(5, 7));
  const day = Number(title.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function isDatedDiaryTitle(entry: { kind: string; title: string }): boolean {
  return entry.kind === "diary" && isRealDateTitle(entry.title);
}

export function monthTitleBounds(month: YearMonth): { start: string; end: string } {
  const next = shiftMonth(month, 1);
  return {
    start: `${padYear(month.year)}-${pad2(month.month)}-01`,
    end: `${padYear(next.year)}-${pad2(next.month)}-01`,
  };
}

export function tokyoDayBounds(date: string): { start: string; end: string } {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const start = Date.UTC(year, month - 1, day) - 9 * 60 * 60 * 1000;
  const end = Date.UTC(year, month - 1, day + 1) - 9 * 60 * 60 * 1000;
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}

export function viewPathHref(viewPath: string): string {
  return `/${encodeURIComponent(viewPath)}`;
}

// The first row for a date wins. Callers pass rows ordered by id ascending.
export function monthDiaryHrefs(
  rows: readonly CalendarSource[],
  month: YearMonth,
): Record<string, string> {
  const bounds = monthTitleBounds(month);
  const hrefs: Record<string, string> = {};
  const ordered = [...rows].sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );
  for (const row of ordered) {
    if (row.visibility !== "public" || row.kind !== "diary") continue;
    if (!row.viewPath) continue;
    if (row.title.length !== 10 || row.title < bounds.start || row.title >= bounds.end) continue;
    if (!isRealDateTitle(row.title) || hrefs[row.title]) continue;
    hrefs[row.title] = viewPathHref(row.viewPath);
  }
  return hrefs;
}

export function monthWeeks(
  month: YearMonth,
  hrefs: Readonly<Record<string, string>>,
  today: string,
): Array<Array<CalendarDay | null>> {
  const count = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate();
  const leading = new Date(Date.UTC(month.year, month.month - 1, 1)).getUTCDay();
  const cells: Array<CalendarDay | null> = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= count; day += 1) {
    const date = `${padYear(month.year)}-${pad2(month.month)}-${pad2(day)}`;
    cells.push({
      date,
      day,
      href: hrefs[date] ?? null,
      accessibleName: `${month.year}年${month.month}月${day}日`,
      current: date === today,
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Array<Array<CalendarDay | null>> = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

export function sameDayLinks(rows: readonly CalendarSource[], date: string): SameDayLink[] {
  if (!isRealDateTitle(date)) return [];
  const bounds = tokyoDayBounds(date);
  return rows
    .filter((row) => {
      if (row.visibility !== "public") return false;
      if (row.kind !== "article" && row.kind !== "note" && row.kind !== "bookmark") return false;
      if (row.inReplyToId) return false;
      if (!row.createdAt || !isoInstant.test(row.createdAt)) return false;
      return row.createdAt >= bounds.start && row.createdAt < bounds.end;
    })
    .sort((left, right) => {
      const byTime = (left.createdAt ?? "").localeCompare(right.createdAt ?? "");
      if (byTime !== 0) return byTime;
      if (left.id < right.id) return -1;
      if (left.id > right.id) return 1;
      return 0;
    })
    .map((row) => ({
      id: row.id,
      href: row.viewPath ? viewPathHref(row.viewPath) : `/e/${row.id}`,
      text: row.title.trim().length > 0 ? row.title : `${canonicalOrigin}/e/${row.id}`,
    }));
}

function yearMonth(date: string): YearMonth {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

function padYear(year: number): string {
  return String(year).padStart(4, "0");
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
