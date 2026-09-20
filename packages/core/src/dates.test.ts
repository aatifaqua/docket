import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, findDates, isIsoDate, parseDateToken, toIsoDate } from './dates.ts';

describe('parseDateToken', () => {
  it('parses ISO dates', () => {
    expect(parseDateToken('2026-03-15')).toBe('2026-03-15');
    expect(parseDateToken(' 2026-3-5 ')).toBe('2026-03-05');
  });

  it('parses US numeric dates with two- and four-digit years', () => {
    expect(parseDateToken('3/15/2026')).toBe('2026-03-15');
    expect(parseDateToken('03/05/26')).toBe('2026-03-05');
  });

  it('parses month-first and day-first written dates', () => {
    expect(parseDateToken('March 3, 2026')).toBe('2026-03-03');
    expect(parseDateToken('Mar. 3rd 2026')).toBe('2026-03-03');
    expect(parseDateToken('SEPTEMBER 28, 2026')).toBe('2026-09-28');
    expect(parseDateToken('15 March 2026')).toBe('2026-03-15');
    expect(parseDateToken('1st of April, 2026')).toBe('2026-04-01');
  });

  it('rejects impossible dates and unknown words', () => {
    expect(parseDateToken('2026-02-30')).toBeNull();
    expect(parseDateToken('13/01/2026')).toBeNull();
    expect(parseDateToken('Suite 12, 2026')).toBeNull();
    expect(parseDateToken('12 Suite 2026')).toBeNull();
    expect(parseDateToken('tomorrow')).toBeNull();
    expect(parseDateToken('')).toBeNull();
  });
});

describe('isIsoDate', () => {
  it('accepts only canonical yyyy-mm-dd strings', () => {
    expect(isIsoDate('2026-03-15')).toBe(true);
    expect(isIsoDate('2026-3-15')).toBe(false);
    expect(isIsoDate('3/15/2026')).toBe(false);
    expect(isIsoDate('2026-02-30')).toBe(false);
  });
});

describe('date arithmetic', () => {
  it('formats UTC dates', () => {
    expect(toIsoDate(new Date(Date.UTC(2026, 0, 5)))).toBe('2026-01-05');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-30', 5)).toBe('2026-02-04');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts whole days between dates in either direction', () => {
    expect(daysBetween('2026-03-01', '2026-03-31')).toBe(30);
    expect(daysBetween('2026-03-31', '2026-03-01')).toBe(-30);
    expect(daysBetween('2026-03-01', '2026-03-01')).toBe(0);
  });
});

describe('findDates', () => {
  it('finds every resolvable date with its offset, in order', () => {
    const text = 'Dated 3/15/2026. Appear on April 2, 2026 or by 2026-05-01; not Feb 30, 2026.';
    expect(findDates(text)).toEqual([
      { iso: '2026-03-15', index: 6 },
      { iso: '2026-04-02', index: 27 },
      { iso: '2026-05-01', index: 47 },
    ]);
  });

  it('returns an empty list when there is nothing to find', () => {
    expect(findDates('within 30 days of receipt')).toEqual([]);
  });
});
