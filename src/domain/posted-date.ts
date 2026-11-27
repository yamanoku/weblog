// A posted day is a calendar date. The stored instant is midnight in Asia/Tokyo.

const CALENDAR_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export type PostedDate =
  | { at: string }
  | { absent: true }
  | { error: "invalid_posted_date" };

// An empty field means the create uses the commit time. Any other value must be a real day.
export function postedDateFromField(value: string | undefined): PostedDate {
  if (value === undefined) return { absent: true };
  const trimmed = value.trim();
  if (trimmed === "") return { absent: true };
  const match = CALENDAR_DAY.exec(trimmed);
  if (!match) return { error: "invalid_posted_date" };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isCalendarDay(year, month, day)) return { error: "invalid_posted_date" };
  return { at: tokyoMidnightIso(year, month, day) };
}

function isCalendarDay(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (lengths[month - 1] ?? 0);
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

// Midnight on that calendar day in Asia/Tokyo, as a UTC ISO instant.
function tokyoMidnightIso(year: number, month: number, day: number): string {
  const wall = new Date(0);
  wall.setUTCFullYear(year, month - 1, day);
  wall.setUTCHours(0, 0, 0, 0);
  const firstOffset = zoneOffsetMinutes(wall, "Asia/Tokyo");
  const first = new Date(wall.getTime() - firstOffset * 60_000);
  const settled = zoneOffsetMinutes(first, "Asia/Tokyo");
  return new Date(wall.getTime() - settled * 60_000).toISOString();
}

// Minutes the IANA zone is ahead of UTC at this instant. ICU supplies the offset.
function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const zoned = new Date(0);
  const hour = pick("hour") === 24 ? 0 : pick("hour");
  zoned.setUTCFullYear(pick("year"), pick("month") - 1, pick("day"));
  zoned.setUTCHours(hour, pick("minute"), pick("second"), 0);
  return Math.round((zoned.getTime() - instant.getTime()) / 60_000);
}
