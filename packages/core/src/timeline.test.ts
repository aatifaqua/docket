import { describe, expect, it } from 'vitest';
import type { Deadline } from './types.ts';
import { buildTimeline, severityFor } from './timeline.ts';

function deadline(overrides: Partial<Deadline> & Pick<Deadline, 'id' | 'kind' | 'date'>): Deadline {
  return {
    label: 'Deadline',
    daysFromReference: null,
    sourceText: overrides.id,
    severity: 'info',
    ...overrides,
  };
}

describe('severityFor', () => {
  it('follows proximity and kind rules', () => {
    expect(severityFor('pay', 7)).toBe('critical');
    expect(severityFor('pay', -3)).toBe('critical');
    expect(severityFor('appear', 90)).toBe('critical');
    expect(severityFor('vacate', 90)).toBe('critical');
    expect(severityFor('pay', 30)).toBe('important');
    expect(severityFor('pay', 31)).toBe('info');
    expect(severityFor('appear', null)).toBe('important');
  });
});

describe('buildTimeline', () => {
  const reference = '2026-03-01';

  it('sorts by date with undated last, recomputes days, and assigns severity', () => {
    const input = [
      deadline({ id: 'dl-0', kind: 'other', date: null }),
      deadline({ id: 'dl-1', kind: 'pay', date: '2026-04-15' }),
      deadline({ id: 'dl-2', kind: 'respond', date: '2026-03-05' }),
      deadline({ id: 'dl-3', kind: 'cure', date: null }),
      deadline({ id: 'dl-4', kind: 'appeal', date: '2026-03-20' }),
    ];
    const result = buildTimeline(input, reference);
    expect(result.map((item) => item.id)).toEqual(['dl-2', 'dl-4', 'dl-1', 'dl-0', 'dl-3']);
    expect(result.map((item) => item.daysFromReference)).toEqual([4, 19, 45, null, null]);
    expect(result.map((item) => item.severity)).toEqual([
      'critical',
      'important',
      'info',
      'important',
      'important',
    ]);
  });

  it('removes duplicates with the same kind and date, keeping the first', () => {
    const input = [
      deadline({ id: 'dl-0', kind: 'pay', date: '2026-03-10' }),
      deadline({ id: 'dl-1', kind: 'pay', date: '2026-03-10' }),
      deadline({ id: 'dl-2', kind: 'vacate', date: '2026-03-10' }),
      deadline({ id: 'dl-3', kind: 'other', date: null }),
      deadline({ id: 'dl-4', kind: 'other', date: null }),
    ];
    expect(buildTimeline(input, reference).map((item) => item.id)).toEqual([
      'dl-0',
      'dl-2',
      'dl-3',
    ]);
  });

  it('does not mutate its input', () => {
    const input = [deadline({ id: 'dl-0', kind: 'pay', date: '2026-03-10' })];
    buildTimeline(input, reference);
    expect(input[0]?.severity).toBe('info');
  });
});
