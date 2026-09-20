import type { CoreAnalysis, Deadline, MoneyAmount } from './types.ts';

/** "1 day" / "3 days" without a grammar slip in user-facing text. */
export function plural(count: number, noun: string): string {
  return `${String(count)} ${noun}${count === 1 ? '' : 's'}`;
}

/** Formats a number as US dollars with cents, matching how notices print amounts. */
export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Describes a day offset relative to the reference date in plain words. */
export function describeDays(days: number): string {
  if (days < 0) return `${plural(-days, 'day')} ago`;
  if (days === 0) return 'today';
  return `in ${plural(days, 'day')}`;
}

/** A deadline whose date could be resolved; narrowing here keeps the describers free of null checks. */
export type DatedDeadline = Deadline & { date: string; daysFromReference: number };

function isDated(deadline: Deadline): deadline is DatedDeadline {
  return deadline.date !== null && deadline.daysFromReference !== null;
}

/** Describes a dated deadline, e.g. “Pay the amount demanded” on 2026-10-06 (in 5 days). */
export function describeDeadline(deadline: DatedDeadline): string {
  return `“${deadline.label}” on ${deadline.date} (${describeDays(deadline.daysFromReference)})`;
}

/** First dated deadline; the timeline is already sorted, so this is the soonest. */
export function soonestDated(core: CoreAnalysis): DatedDeadline | undefined {
  return core.deadlines.find(isDated);
}

/** Largest amount in the document, or undefined when none were found. */
export function largestAmount(core: CoreAnalysis): MoneyAmount | undefined {
  let largest: MoneyAmount | undefined;
  for (const amount of core.amounts) {
    if (largest === undefined || amount.amount > largest.amount) largest = amount;
  }
  return largest;
}
