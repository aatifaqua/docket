import type { Deadline, DeadlineKind, Severity } from './types.ts';
import { daysBetween } from './dates.ts';

/**
 * Severity from proximity and kind. Court appearances and move-out dates are always
 * critical because missing them has immediate, hard-to-reverse consequences.
 */
export function severityFor(kind: DeadlineKind, days: number | null): Severity {
  if (days === null) return 'important';
  if (days <= 7 || kind === 'appear' || kind === 'vacate') return 'critical';
  if (days <= 30) return 'important';
  return 'info';
}

function compareByDate(a: Deadline, b: Deadline): number {
  if (a.date === b.date) return 0;
  if (a.date === null) return 1;
  if (b.date === null) return -1;
  return a.date < b.date ? -1 : 1;
}

/**
 * Recomputes day counts against `referenceDate`, drops duplicate (kind, date) pairs keeping
 * the first in document order, assigns severity, and sorts soonest first with undated last.
 */
export function buildTimeline(deadlines: Deadline[], referenceDate: string): Deadline[] {
  const seen = new Set<string>();
  const unique: Deadline[] = [];
  for (const deadline of deadlines) {
    const key = `${deadline.kind}|${deadline.date ?? 'undated'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const days = deadline.date === null ? null : daysBetween(referenceDate, deadline.date);
    unique.push({
      ...deadline,
      daysFromReference: days,
      severity: severityFor(deadline.kind, days),
    });
  }
  return unique.sort(compareByDate);
}
