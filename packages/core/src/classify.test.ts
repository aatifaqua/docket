import { describe, expect, it } from 'vitest';
import { classifyDocument } from './classify.ts';
import { SIGNALS } from './classify.data.ts';

describe('classifyDocument', () => {
  it('returns unknown with zero confidence when nothing matches', () => {
    expect(classifyDocument('Hello there, this is a friendly note about the weather.')).toEqual({
      kind: 'unknown',
      confidence: 0,
      signals: [],
    });
  });

  it('recognises each kind from its strongest phrases', () => {
    expect(
      classifyDocument('NOTICE TO QUIT: the landlord demands the tenant pay or quit.').kind,
    ).toBe('eviction_notice');
    expect(classifyDocument('This is a formal demand for payment. Cease and desist.').kind).toBe(
      'demand_letter',
    );
    expect(classifyDocument('SUMMONS. You are hereby summoned by the plaintiff.').kind).toBe(
      'court_summons',
    );
    expect(
      classifyDocument('This validation notice comes from a debt collector (FDCPA).').kind,
    ).toBe('debt_collection');
    expect(
      classifyDocument('This is your final written warning; termination of employment may follow.')
        .kind,
    ).toBe('employment_notice');
    expect(
      classifyDocument('Your claim has been denied. See your appeal rights. Adjuster: X').kind,
    ).toBe('insurance_denial');
  });

  it('matches on word boundaries and ignores case', () => {
    expect(classifyDocument('The current parent apparently went to the store.').kind).toBe(
      'unknown',
    );
    expect(classifyDocument('RENT is due to the LANDLORD.').signals).toEqual(['landlord', 'rent']);
  });

  it('clamps confidence to 0.99 for an unopposed match and 0.5 for a tie', () => {
    expect(classifyDocument('summons').confidence).toBe(0.99);
    const tie = classifyDocument('The tenant asked about coverage.');
    expect(tie.confidence).toBe(0.5);
    expect(tie.kind).toBe('eviction_notice');
  });

  it('never reports confidence below 0.34 and keeps at most eight signals', () => {
    const everything = Object.values(SIGNALS)
      .flatMap((signals) => signals.map((signal) => signal.phrase))
      .join('. ');
    const result = classifyDocument(everything);
    expect(result.confidence).toBeGreaterThanOrEqual(0.34);
    expect(result.confidence).toBeLessThanOrEqual(0.99);
    expect(result.signals).toHaveLength(8);
  });

  it('replaces the runner-up when a later kind scores between the top two', () => {
    const text =
      'summons summons plaintiff defendant. claim denied. cease and desist letter demand.';
    const result = classifyDocument(text);
    expect(result.kind).toBe('court_summons');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('ships at least eight weighted phrases per kind', () => {
    for (const signals of Object.values(SIGNALS)) {
      expect(signals.length).toBeGreaterThanOrEqual(8);
      for (const signal of signals) expect([1, 2, 3]).toContain(signal.weight);
    }
  });
});
