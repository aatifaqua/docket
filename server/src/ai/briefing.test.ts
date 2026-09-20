import { describe, expect, it, vi } from 'vitest';
import { SAMPLE_NOTICES, analyzeDocument, type Briefing } from '@docket/core';
import type { Logger } from '../log.ts';
import {
  createGeminiBriefingService,
  createMockBriefingService,
  filterCitations,
  reconcileBriefing,
} from './briefing.ts';
import type { GeminiClient } from './gemini.ts';

const sample = SAMPLE_NOTICES[0]!;
const core = analyzeDocument(sample.text, '2026-09-21');
const knownOption = core.options[0]!.id;
const knownDeadline = core.deadlines[0]!.id;

function modelBriefing(): Briefing {
  return {
    whatThisIs: 'A notice from your landlord about unpaid rent.',
    plainSummary: 'You owe rent and have a few days to pay or move out.',
    keyPoints: ['Pay or move out within five days.'],
    optionNotes: [
      { optionId: knownOption, whatItMeansForYou: 'Paying keeps you in the home.' },
      { optionId: 'made-up-option', whatItMeansForYou: 'Should be dropped.' },
    ],
    checklist: [
      { id: 'ck-1', text: 'Pay the full amount.', relatedDeadlineId: knownDeadline },
      { id: 'whatever', text: 'Keep the envelope.', relatedDeadlineId: 'dl-999' },
    ],
    prepSheet: {
      questionsForProfessional: ['Q?'],
      documentsToGather: ['Lease'],
      factsToWriteDown: [],
    },
    termsExplained: [{ term: 'unlawful detainer', meaning: 'The court case a landlord files.' }],
  };
}

/** Fake client that runs the real parse callback so schema failures surface like production. */
function clientReturning(raw: unknown, model = 'gemini-3.8-flash'): GeminiClient {
  return {
    generateJson: (_schema, _system, _user, parse) => Promise.resolve({ value: parse(raw), model }),
  };
}

type WarnSpy = ReturnType<typeof vi.fn<Logger['warn']>>;

function spyLogger(): { logger: Logger; warn: WarnSpy } {
  const warn = vi.fn<Logger['warn']>();
  return { logger: { info: () => undefined, warn }, warn };
}

describe('mock briefing service', () => {
  it('uses the deterministic fallback for briefings and answers', async () => {
    const service = createMockBriefingService();
    const generated = await service.generate(core, sample.text);
    expect(generated.source).toBe('fallback');
    expect(generated.briefing.optionNotes).toHaveLength(core.options.length);
    const answer = await service.answer('How much rent is owed?', core, sample.text);
    expect(answer.source).toBe('fallback');
    expect(answer.grounded).toBe(true);
  });
});

describe('reconcileBriefing and filterCitations', () => {
  it('drops unknown option ids, nulls unknown deadline ids and renumbers checklist ids', () => {
    const result = reconcileBriefing(modelBriefing(), core);
    expect(result.optionNotes.map((note) => note.optionId)).toEqual([knownOption]);
    expect(result.checklist).toEqual([
      { id: 'ck-1', text: 'Pay the full amount.', relatedDeadlineId: knownDeadline },
      { id: 'ck-2', text: 'Keep the envelope.', relatedDeadlineId: null },
    ]);
  });

  it('keeps only citations that literally occur in the document', () => {
    const text = 'You must pay $1,925.00 within five days.';
    expect(
      filterCitations(['  pay $1,925.00 ', 'PAY $1,925.00 WITHIN', 'ten days', ''], text),
    ).toEqual(['pay $1,925.00', 'PAY $1,925.00 WITHIN']);
  });
});

describe('gemini briefing service', () => {
  it('returns the reconciled model briefing with source gemini and the model name', async () => {
    const { logger, warn } = spyLogger();
    const service = createGeminiBriefingService(clientReturning(modelBriefing()), logger);
    const result = await service.generate(core, sample.text);
    expect(result.source).toBe('gemini');
    expect(result.model).toBe('gemini-3.8-flash');
    expect(result.briefing.optionNotes).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back with a single warning when the response fails schema validation', async () => {
    const { logger, warn } = spyLogger();
    const service = createGeminiBriefingService(clientReturning({ whatThisIs: 42 }), logger);
    const result = await service.generate(core, sample.text);
    expect(result.source).toBe('fallback');
    expect(result.model).toBeUndefined();
    expect(result.briefing.keyPoints.length).toBeGreaterThan(0);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'gemini_fallback',
      expect.objectContaining({ stage: 'briefing' }),
    );
  });

  it('falls back when the client rejects', async () => {
    const { logger, warn } = spyLogger();
    const client: GeminiClient = { generateJson: () => Promise.reject(new Error('timeout')) };
    const service = createGeminiBriefingService(client, logger);
    await expect(service.generate(core, sample.text)).resolves.toMatchObject({
      source: 'fallback',
    });
    const answer = await service.answer('When is rent due?', core, sample.text);
    expect(answer.source).toBe('fallback');
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('answers with filtered citations from the model', async () => {
    const raw = {
      answer: 'You owe $1,925.00 in total.',
      grounded: true,
      citations: ['for a total of $1,925.00', 'this quote was invented'],
    };
    const service = createGeminiBriefingService(clientReturning(raw), spyLogger().logger);
    const answer = await service.answer('How much?', core, sample.text);
    expect(answer).toEqual({
      answer: 'You owe $1,925.00 in total.',
      grounded: true,
      citations: ['for a total of $1,925.00'],
      source: 'gemini',
    });
  });

  it('uses a default logger when none is injected', async () => {
    const service = createGeminiBriefingService(clientReturning(modelBriefing()));
    await expect(service.generate(core, sample.text)).resolves.toMatchObject({ source: 'gemini' });
  });
});
