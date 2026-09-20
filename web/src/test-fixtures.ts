import { analyzeDocument, buildFallbackBriefing, DISCLAIMER, SAMPLE_NOTICES } from '@docket/core';
import type { Analysis } from '@docket/core';

/** Fixed reference date so every fixture deadline resolves to the same calendar day. */
export const REFERENCE_DATE = '2026-10-01';

/** Returns one of the three bundled sample notices, failing loudly if the index is wrong. */
export function sampleNotice(index = 0): (typeof SAMPLE_NOTICES)[number] {
  const sample = SAMPLE_NOTICES[index];
  if (sample === undefined) throw new Error(`No sample notice at index ${String(index)}`);
  return sample;
}

/**
 * Builds a realistic Analysis entirely offline: the deterministic core plus the fallback
 * briefing, exactly what demo mode produces for pasted text.
 */
export function fixtureAnalysis(index = 0): Analysis {
  const sample = sampleNotice(index);
  const core = analyzeDocument(sample.text, REFERENCE_DATE);
  return {
    id: `fixture-${sample.id}`,
    createdAt: '2026-10-01T09:00:00.000Z',
    core,
    briefing: buildFallbackBriefing(core),
    source: 'fallback',
    disclaimer: DISCLAIMER,
  };
}
