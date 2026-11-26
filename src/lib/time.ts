// All times are stored in UTC and shown in the school's time zone.
export const TIME_ZONE = process.env.APP_TIMEZONE || "Asia/Yekaterinburg";

/** Offset in minutes of `tz` from UTC at the given instant. */
function offsetMinutes(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const n = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** Parses "YYYY-MM-DDTHH:mm" (an <input type="datetime-local"> value) as wall time in `tz`. */
export function parseLocal(value: string, tz = TIME_ZONE): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const off = offsetMinutes(new Date(guess), tz);
  return new Date(guess - off * 60000);
}

export function fmtDateTime(d: Date, tz = TIME_ZONE) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

export function fmtTime(d: Date, tz = TIME_ZONE) {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(d);
}

export function fmtShortDate(d: Date, tz = TIME_ZONE) {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: tz, day: "2-digit", month: "2-digit" }).format(d);
}

/** Start and end (UTC) of the calendar day containing `at`, in `tz`. */
export function dayBounds(at: Date, tz = TIME_ZONE): { start: Date; end: Date } {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  const start = parseLocal(`${ymd}T00:00`, tz)!;
  return { start, end: new Date(start.getTime() + 24 * 3600 * 1000) };
}
