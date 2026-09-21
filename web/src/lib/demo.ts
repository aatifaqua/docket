/**
 * In-browser analysis for the GitHub Pages demo. This module is loaded on demand from api.ts,
 * so the intake screen does not download the core extractors or the sample briefings until
 * the user actually asks for an analysis.
 */
import {
  analyzeDocument,
  buildFallbackAnswer,
  buildFallbackBriefing,
  CoreError,
  DISCLAIMER,
  SAMPLE_NOTICES,
} from '@docket/core';
import type { Analysis, Answer, Briefing, BriefingSource, CoreAnalysis } from '@docket/core';
import demoBriefings from './demo-briefings.json';
import { ApiError, type AnalyzeInput, type AskInput } from './api.ts';

const PREGENERATED: Readonly<Record<string, Briefing | undefined>> = demoBriefings;

/** Small non-cryptographic hash so demo analyses get a stable id for checklist persistence. */
function hashText(input: string): string {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }
  return (hash >>> 0).toString(16);
}

/** Sample notices ship with a briefing Gemini wrote ahead of time; anything else is explained offline. */
function briefingFor(
  text: string,
  sampleId: string | null | undefined,
  core: CoreAnalysis,
): { briefing: Briefing; source: BriefingSource } {
  const sample = SAMPLE_NOTICES.find((entry) => entry.id === sampleId);
  const pregenerated = sample?.text === text ? PREGENERATED[sample.id] : null;
  return pregenerated
    ? { briefing: pregenerated, source: 'gemini' }
    : { briefing: buildFallbackBriefing(core), source: 'fallback' };
}

/** Runs the deterministic core in the browser; nothing leaves the device. */
export function analyzeInBrowser({ text, referenceDate, sampleId }: AnalyzeInput): Analysis {
  let core: CoreAnalysis;
  try {
    core = analyzeDocument(text, referenceDate);
  } catch (error) {
    if (error instanceof CoreError) throw new ApiError(error.message);
    throw error;
  }
  const { briefing, source } = briefingFor(text, sampleId, core);
  return {
    id: `demo-${hashText(`${text}\n${referenceDate}`)}`,
    createdAt: new Date().toISOString(),
    core,
    briefing,
    source,
    disclaimer: DISCLAIMER,
  };
}

/** Answers by quoting matching sentences from the text; never invents facts. */
export function answerInBrowser({ question, core, text }: AskInput): Answer {
  return buildFallbackAnswer(question, core, text);
}
