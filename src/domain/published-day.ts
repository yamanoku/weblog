// Groups a home timeline by the calendar date of publishedAt in Asia/Tokyo.
// The stored value stays a UTC instant. The zone is fixed so the date does not follow the server clock.

const tokyo = "Asia/Tokyo";

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: tokyo,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const labelFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: tokyo,
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function tokyoPublishedDay(iso: string): { date: string; label: string } | null {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return null;
  const date = dayFormat.format(instant);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { date, label: labelFormat.format(instant) };
}

export type PublishedDayGroup<T> = {
  date: string;
  label: string;
  entries: T[];
};

// The list is already newest publishedAt first. A later instant is never an earlier Tokyo date.
export function groupByPublishedDay<T extends { id: string; publishedAt?: string | null }>(
  entries: T[],
): PublishedDayGroup<T>[] {
  const groups: PublishedDayGroup<T>[] = [];
  for (const entry of entries) {
    const day = entry.publishedAt ? tokyoPublishedDay(entry.publishedAt) : null;
    const date = day?.date ?? "";
    const label = day?.label ?? "";
    const last = groups.at(-1);
    if (last && last.date === date) last.entries.push(entry);
    else groups.push({ date, label, entries: [entry] });
  }
  return groups;
}
