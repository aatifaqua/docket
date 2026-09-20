import { describe, expect, it } from 'vitest';
import { CoreError, analyzeDocument } from './analyze.ts';
import { MAX_INPUT_CHARS } from './sanitize.ts';
import { SAMPLE_NOTICES } from './samples.ts';

const reference = '2026-10-01';
const filler = 'this sentence is only here to reach the minimum word count for analysis. ';

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error instanceof CoreError ? error.code : 'not-a-core-error';
  }
}

describe('analyzeDocument', () => {
  it('rejects short, over-long, and badly dated input with typed errors', () => {
    expect(codeOf(() => analyzeDocument('too short', reference))).toBe('TOO_SHORT');
    expect(codeOf(() => analyzeDocument('x'.repeat(MAX_INPUT_CHARS + 1), reference))).toBe(
      'TOO_LONG',
    );
    expect(codeOf(() => analyzeDocument(filler.repeat(5), '10/01/2026'))).toBe('INVALID_DATE');
    expect(codeOf(() => analyzeDocument(filler.repeat(5), '2026-02-30'))).toBe('INVALID_DATE');
    const error = new CoreError('TOO_SHORT');
    expect(error.name).toBe('CoreError');
    expect(error.message).toContain('40 words');
    expect(error).toBeInstanceOf(Error);
  });

  it('counts words after sanitising so markup cannot pad the input', () => {
    const markup = '<div>'.repeat(60) + 'only three words' + '</div>'.repeat(60);
    expect(codeOf(() => analyzeDocument(markup, reference))).toBe('TOO_SHORT');
  });

  it('produces an unknown analysis with generic options for unrecognised text', () => {
    const result = analyzeDocument(filler.repeat(5), reference);
    expect(result.classification.kind).toBe('unknown');
    expect(result.options).toHaveLength(3);
    expect(result.deadlines).toEqual([]);
    expect(result.wordCount).toBe(65);
    expect(result.referenceDate).toBe(reference);
  });

  it('is deterministic for the same input and reference date', () => {
    const sample = SAMPLE_NOTICES[0];
    expect(analyzeDocument(String(sample?.text), reference)).toEqual(
      analyzeDocument(String(sample?.text), reference),
    );
  });

  describe.each(SAMPLE_NOTICES)('sample $id', (sample) => {
    const core = analyzeDocument(sample.text, reference);

    it('classifies as the expected kind with strong confidence', () => {
      expect(core.classification.kind).toBe(sample.kind);
      expect(core.classification.confidence).toBeGreaterThanOrEqual(0.9);
      expect(core.classification.signals.length).toBeGreaterThan(0);
    });

    it('finds at least one dated deadline, an amount, and a duty on the reader', () => {
      expect(core.deadlines.some((deadline) => deadline.date !== null)).toBe(true);
      expect(core.amounts.length).toBeGreaterThan(0);
      expect(core.obligations.some((obligation) => obligation.party === 'you')).toBe(true);
      expect(core.options.length).toBeGreaterThanOrEqual(3);
      expect(core.options.length).toBeLessThanOrEqual(4);
      expect(core.wordCount).toBeGreaterThanOrEqual(180);
      expect(core.wordCount).toBeLessThanOrEqual(400);
    });
  });

  it('extracts the expected facts from the eviction sample', () => {
    const core = analyzeDocument(String(SAMPLE_NOTICES[0]?.text), reference);
    expect(core.deadlines.map((d) => [d.kind, d.date, d.severity])).toEqual([
      ['vacate', '2026-10-06', 'critical'],
      ['pay', '2026-10-06', 'critical'],
    ]);
    expect(core.amounts.map((a) => a.amount)).toEqual([1850, 75, 1925]);
  });

  it('extracts the expected facts from the summons and debt samples', () => {
    const summons = analyzeDocument(String(SAMPLE_NOTICES[1]?.text), reference);
    expect(summons.deadlines.map((d) => [d.kind, d.date])).toEqual([
      ['respond', '2026-10-31'],
      ['appear', '2026-11-12'],
    ]);
    const debt = analyzeDocument(String(SAMPLE_NOTICES[2]?.text), reference);
    expect(debt.deadlines.map((d) => [d.kind, d.date])).toEqual([
      ['respond', '2026-10-31'],
      ['other', '2026-11-02'],
    ]);
    expect(debt.amounts[0]?.amount).toBe(2317.45);
  });
});
