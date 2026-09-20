import { describe, expect, it } from 'vitest';
import type { DocumentKind } from './types.ts';
import { getOptions } from './options.ts';

const KINDS: DocumentKind[] = [
  'eviction_notice',
  'demand_letter',
  'court_summons',
  'debt_collection',
  'employment_notice',
  'insurance_denial',
  'unknown',
];

describe('getOptions', () => {
  it('returns three or four well-formed options per kind with kind-prefixed unique ids', () => {
    const allIds = new Set<string>();
    for (const kind of KINDS) {
      const options = getOptions(kind);
      expect(options.length).toBeGreaterThanOrEqual(3);
      expect(options.length).toBeLessThanOrEqual(4);
      for (const option of options) {
        expect(option.id.startsWith(`${kind}-`)).toBe(true);
        expect(allIds.has(option.id)).toBe(false);
        allIds.add(option.id);
        expect(option.title.length).toBeGreaterThan(0);
        expect(option.summary.length).toBeGreaterThan(20);
        expect(option.pros.length).toBeGreaterThanOrEqual(1);
        expect(option.pros.length).toBeLessThanOrEqual(4);
        expect(option.cons.length).toBeGreaterThanOrEqual(1);
        expect(option.cons.length).toBeLessThanOrEqual(4);
        expect(option.typicalNextStep.length).toBeGreaterThan(0);
        expect(['critical', 'important', 'info']).toContain(option.urgency);
      }
    }
  });

  it('gives unknown documents exactly three generic options', () => {
    expect(getOptions('unknown')).toHaveLength(3);
  });

  it('returns fresh copies so callers cannot corrupt the catalogue', () => {
    const first = getOptions('eviction_notice');
    first[0]?.pros.push('mutated');
    expect(getOptions('eviction_notice')[0]?.pros).not.toContain('mutated');
  });
});
