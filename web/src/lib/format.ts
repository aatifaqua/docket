import type { DocumentKind, Severity } from '@docket/core';

/** Plain-language names for document kinds shown in the results header badge. */
export const KIND_LABELS: Readonly<Record<DocumentKind, string>> = {
  eviction_notice: 'Eviction notice',
  demand_letter: 'Demand letter',
  court_summons: 'Court summons',
  debt_collection: 'Debt-collection letter',
  employment_notice: 'Employment notice',
  insurance_denial: 'Insurance claim denial',
  unknown: 'Unrecognised document',
};

/**
 * Severity is always shown as a glyph plus a word. Colour is added by CSS only as
 * reinforcement, so users who cannot perceive colour still get the same information.
 */
export const SEVERITY_LABELS: Readonly<Record<Severity, { glyph: string; word: string }>> = {
  critical: { glyph: '!', word: 'Urgent' },
  important: { glyph: '•', word: 'Important' },
  info: { glyph: 'i', word: 'Info' },
};

const LONG_DATE = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

/** Formats an ISO date (yyyy-mm-dd) as "October 6, 2026"; returns the input if it is not one. */
export function formatLongDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (match === null) return iso;
  const [, year, month, day] = match;
  return LONG_DATE.format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
}

/** "in 5 days", "today", "3 days ago", or "date not stated" for undated deadlines. */
export function describeRelativeDays(days: number | null): string {
  if (days === null) return 'date not stated';
  if (days === 0) return 'today';
  const unit = Math.abs(days) === 1 ? 'day' : 'days';
  return days > 0 ? `in ${String(days)} ${unit}` : `${String(-days)} ${unit} ago`;
}

/** Turns the classifier's numeric confidence into words, so no user has to interpret 0.94. */
export function describeConfidence(confidence: number): string {
  if (confidence >= 0.75) return 'Fairly confident';
  if (confidence >= 0.5) return 'Somewhat confident';
  if (confidence > 0) return 'Not very confident';
  return 'Could not tell';
}

/** Counts whitespace-separated words; mirrors the core's minimum-length check. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

/** Local calendar date as yyyy-mm-dd, the default reference date for a notice received today. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${String(now.getFullYear())}-${month}-${day}`;
}
