import {
  buildFallbackAnswer,
  buildFallbackBriefing,
  DISCLAIMER,
  type Answer,
  type Briefing,
  type BriefingSource,
  type CoreAnalysis,
} from '@docket/core';
import { createLogger, type Logger } from '../log.ts';
import type { GeminiClient } from './gemini.ts';
import {
  buildAnswerSystemPrompt,
  buildAnswerUserPrompt,
  buildBriefingSystemPrompt,
  buildBriefingUserPrompt,
} from './prompts.ts';
import {
  ANSWER_RESPONSE_SCHEMA,
  BRIEFING_RESPONSE_SCHEMA,
  parseAnswer,
  parseBriefing,
} from './schemas.ts';

export interface BriefingResult {
  briefing: Briefing;
  source: BriefingSource;
  model?: string;
}

/** The language layer behind the API; the deterministic core never depends on it. */
export interface BriefingService {
  generate(core: CoreAnalysis, text: string): Promise<BriefingResult>;
  answer(question: string, core: CoreAnalysis, text: string): Promise<Answer>;
}

/** Offline implementation used in mock mode and by tests; never touches the network. */
export function createMockBriefingService(): BriefingService {
  return {
    generate: (core) =>
      Promise.resolve({ briefing: buildFallbackBriefing(core), source: 'fallback' }),
    answer: (question, core, text) => Promise.resolve(buildFallbackAnswer(question, core, text)),
  };
}

/**
 * Keeps only what the deterministic analysis vouches for: option notes must point at real
 * options, checklist items may only reference real deadlines, and ids are renumbered so the
 * UI can rely on them.
 */
export function reconcileBriefing(briefing: Briefing, core: CoreAnalysis): Briefing {
  const optionIds = new Set(core.options.map((option) => option.id));
  const deadlineIds = new Set(core.deadlines.map((deadline) => deadline.id));
  return {
    ...briefing,
    whatThisIs: withoutDisclaimer(briefing.whatThisIs),
    plainSummary: withoutDisclaimer(briefing.plainSummary),
    optionNotes: briefing.optionNotes.filter((note) => optionIds.has(note.optionId)),
    checklist: briefing.checklist.map((item, index) => ({
      id: `ck-${String(index + 1)}`,
      text: item.text,
      relatedDeadlineId:
        item.relatedDeadlineId !== null && deadlineIds.has(item.relatedDeadlineId)
          ? item.relatedDeadlineId
          : null,
    })),
  };
}

/** The UI shows the disclaimer once; models sometimes echo it, which wastes the reader's attention. */
export function withoutDisclaimer(prose: string): string {
  const cleaned = prose
    .split(DISCLAIMER)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned === '' ? prose : cleaned;
}

/** Drops any citation that does not literally occur in the document, so quotes cannot be invented. */
export function filterCitations(citations: readonly string[], text: string): string[] {
  const haystack = text.toLowerCase();
  return citations
    .map((citation) => citation.trim())
    .filter((citation) => citation.length > 0 && haystack.includes(citation.toLowerCase()));
}

/**
 * Gemini-backed implementation. Any failure (network, timeout, schema mismatch) is logged in
 * one line and answered with the deterministic fallback, so the user always gets a complete
 * result and the API never returns a model error.
 */
export function createGeminiBriefingService(
  client: GeminiClient,
  logger: Logger = createLogger(),
): BriefingService {
  const warn = (stage: string, error: unknown): void => {
    logger.warn('gemini_fallback', {
      stage,
      reason: error instanceof Error ? error.message : String(error),
    });
  };

  return {
    async generate(core, text) {
      try {
        const { value, model } = await client.generateJson(
          BRIEFING_RESPONSE_SCHEMA,
          buildBriefingSystemPrompt(),
          buildBriefingUserPrompt(core, text),
          parseBriefing,
        );
        return { briefing: reconcileBriefing(value, core), source: 'gemini', model };
      } catch (error) {
        warn('briefing', error);
        return { briefing: buildFallbackBriefing(core), source: 'fallback' };
      }
    },
    async answer(question, core, text) {
      try {
        const { value } = await client.generateJson(
          ANSWER_RESPONSE_SCHEMA,
          buildAnswerSystemPrompt(),
          buildAnswerUserPrompt(question, core, text),
          parseAnswer,
        );
        return {
          answer: value.answer,
          grounded: value.grounded,
          citations: filterCitations(value.citations, text),
          source: 'gemini',
        };
      } catch (error) {
        warn('answer', error);
        return buildFallbackAnswer(question, core, text);
      }
    },
  };
}
