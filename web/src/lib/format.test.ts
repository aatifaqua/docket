import { describe, expect, it } from 'vitest';
import {
  countWords,
  describeConfidence,
  describeRelativeDays,
  formatLongDate,
  todayIso,
} from './format.ts';

describe('formatLongDate', () => {
  it('writes ISO dates in long US form without timezone drift', () => {
    expect(formatLongDate('2026-10-06')).toBe('October 6, 2026');
    expect(formatLongDate('2026-01-01')).toBe('January 1, 2026');
  });

  it('returns anything that is not an ISO date unchanged', () => {
    expect(formatLongDate('soon')).toBe('soon');
  });
});

describe('describeRelativeDays', () => {
  it('covers future, today, past, singular and undated', () => {
    expect(describeRelativeDays(5)).toBe('in 5 days');
    expect(describeRelativeDays(1)).toBe('in 1 day');
    expect(describeRelativeDays(0)).toBe('today');
    expect(describeRelativeDays(-1)).toBe('1 day ago');
    expect(describeRelativeDays(-12)).toBe('12 days ago');
    expect(describeRelativeDays(null)).toBe('date not stated');
  });
});

describe('describeConfidence', () => {
  it('maps the numeric confidence to words', () => {
    expect(describeConfidence(0.94)).toBe('Fairly confident');
    expect(describeConfidence(0.6)).toBe('Somewhat confident');
    expect(describeConfidence(0.4)).toBe('Not very confident');
    expect(describeConfidence(0)).toBe('Could not tell');
  });
});

describe('countWords and todayIso', () => {
  it('counts whitespace-separated words and ignores blank input', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords('one two\nthree   four')).toBe(4);
  });

  it('formats the local date as yyyy-mm-dd', () => {
    expect(todayIso(new Date(2026, 2, 5))).toBe('2026-03-05');
  });
});
