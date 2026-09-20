/**
 * Date helpers for the deterministic core.
 *
 * Rationale: every calculation uses UTC so results are identical in any timezone, and the
 * reference date is always passed in, so the same document always yields the same timeline.
 */

const MS_PER_DAY = 86_400_000;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const ISO_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const US_NUMERIC_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/;
const MONTH_FIRST_RE = /^([a-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i;
const DAY_FIRST_RE = /^(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]{3,})\.?,?\s+(\d{4})$/i;

/** Finds date-looking tokens inside prose; every hit is then confirmed by `parseDateToken`. */
const DATE_SCAN_RE = new RegExp(
  '\\b(?:\\d{4}-\\d{1,2}-\\d{1,2}|\\d{1,2}\\/\\d{1,2}\\/(?:\\d{4}|\\d{2})|' +
    '[A-Za-z]{3,}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}|' +
    '\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?[A-Za-z]{3,}\\.?,?\\s+\\d{4})\\b',
  'g',
);

export interface DateHit {
  iso: string;
  /** Character offset of the token inside the scanned text. */
  index: number;
}

/** Reads a capture group; the patterns guarantee it exists, so no fallback branch is needed. */
function group(match: RegExpExecArray, index: number): string {
  return String(match[index]);
}

function monthIndex(name: string): number {
  return MONTHS.indexOf(name.slice(0, 3).toLowerCase());
}

function isoToMs(iso: string): number {
  return Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
}

/** Builds an ISO date only when the parts describe a real calendar day (rejects Feb 30 etc.). */
function fromParts(year: number, month: number, day: number): string | null {
  const candidate = new Date(Date.UTC(year, month, day));
  const isRealDay = candidate.getUTCMonth() === month && candidate.getUTCDate() === day;
  return isRealDay ? toIsoDate(candidate) : null;
}

function parseIso(token: string): string | null {
  const match = ISO_RE.exec(token);
  if (match === null) return null;
  return fromParts(Number(group(match, 1)), Number(group(match, 2)) - 1, Number(group(match, 3)));
}

function parseUsNumeric(token: string): string | null {
  const match = US_NUMERIC_RE.exec(token);
  if (match === null) return null;
  const yearText = group(match, 3);
  const year = Number(yearText.length === 2 ? `20${yearText}` : yearText);
  return fromParts(year, Number(group(match, 1)) - 1, Number(group(match, 2)));
}

function parseMonthFirst(token: string): string | null {
  const match = MONTH_FIRST_RE.exec(token);
  if (match === null) return null;
  return fromParts(Number(group(match, 3)), monthIndex(group(match, 1)), Number(group(match, 2)));
}

function parseDayFirst(token: string): string | null {
  const match = DAY_FIRST_RE.exec(token);
  if (match === null) return null;
  return fromParts(Number(group(match, 3)), monthIndex(group(match, 2)), Number(group(match, 1)));
}

const PARSERS = [parseIso, parseUsNumeric, parseMonthFirst, parseDayFirst];

/** Formats a Date as yyyy-mm-dd using its UTC fields. */
export function toIsoDate(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${String(date.getUTCFullYear())}-${month}-${day}`;
}

/**
 * Parses one date token ("2026-03-15", "3/15/2026", "March 15, 2026", "15 March 2026")
 * into yyyy-mm-dd, or null when it is not a real calendar date.
 */
export function parseDateToken(token: string): string | null {
  const trimmed = token.trim();
  for (const parse of PARSERS) {
    const iso = parse(trimmed);
    if (iso !== null) return iso;
  }
  return null;
}

/** True only for a canonical yyyy-mm-dd string that names a real day. */
export function isIsoDate(value: string): boolean {
  return parseDateToken(value) === value;
}

/** Adds whole calendar days to an ISO date (negative values subtract). */
export function addDays(iso: string, days: number): string {
  return toIsoDate(new Date(isoToMs(iso) + days * MS_PER_DAY));
}

/** Whole calendar days from `fromIso` to `toIso`; negative when `toIso` is earlier. */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((isoToMs(toIso) - isoToMs(fromIso)) / MS_PER_DAY);
}

/** Scans free text for every resolvable date, in document order. */
export function findDates(text: string): DateHit[] {
  const hits: DateHit[] = [];
  for (const match of text.matchAll(DATE_SCAN_RE)) {
    const iso = parseDateToken(match[0]);
    if (iso !== null) hits.push({ iso, index: match.index });
  }
  return hits;
}
