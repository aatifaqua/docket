import { describe, expect, it } from 'vitest';
import { SAMPLE_NOTICES } from './samples.ts';

describe('SAMPLE_NOTICES', () => {
  it('ships exactly three samples covering eviction, summons, and debt collection', () => {
    expect(SAMPLE_NOTICES.map((sample) => sample.kind)).toEqual([
      'eviction_notice',
      'court_summons',
      'debt_collection',
    ]);
    expect(new Set(SAMPLE_NOTICES.map((sample) => sample.id)).size).toBe(3);
  });

  it('keeps each sample between 180 and 400 words with material for every extractor', () => {
    for (const sample of SAMPLE_NOTICES) {
      const words = sample.text.split(/\s+/).filter((word) => word.length > 0).length;
      expect(words).toBeGreaterThanOrEqual(180);
      expect(words).toBeLessThanOrEqual(400);
      expect(sample.title.length).toBeGreaterThan(0);
      expect(sample.text).toMatch(/\$\d/);
      expect(sample.text).toMatch(/you must/i);
      expect(sample.text).toMatch(/\b\d+ days\b|\(\d+\) days\b/i);
      expect(sample.text).toMatch(
        /\b(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}\b/,
      );
    }
  });
});
