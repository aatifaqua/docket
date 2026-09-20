import { describe, expect, it } from 'vitest';
import type { CoreAnalysis, Deadline } from './types.ts';
import { analyzeDocument } from './analyze.ts';
import { buildFallbackAnswer, buildFallbackBriefing } from './fallback.ts';
import { describeDays, formatMoney, plural } from './fallback.describe.ts';
import { getOptions } from './options.ts';
import { SAMPLE_NOTICES } from './samples.ts';

const reference = '2026-10-01';

function emptyCore(overrides: Partial<CoreAnalysis> = {}): CoreAnalysis {
  return {
    referenceDate: reference,
    classification: { kind: 'unknown', confidence: 0, signals: [] },
    deadlines: [],
    obligations: [],
    amounts: [],
    options: getOptions('unknown'),
    wordCount: 50,
    ...overrides,
  };
}

function undated(kind: Deadline['kind'], label: string): Deadline {
  return {
    id: 'dl-0',
    kind,
    label,
    date: null,
    daysFromReference: null,
    sourceText: 'Respond immediately.',
    severity: 'important',
  };
}

describe('buildFallbackBriefing', () => {
  it('fills every field from a full analysis', () => {
    const core = analyzeDocument(String(SAMPLE_NOTICES[0]?.text), reference);
    const briefing = buildFallbackBriefing(core);
    expect(briefing.whatThisIs).toMatch(/^This looks like an eviction notice: /);
    expect(briefing.whatThisIs).toContain('“pay rent or quit”');
    expect(briefing.plainSummary.split(/\s+/).length).toBeLessThanOrEqual(120);
    expect(briefing.plainSummary).toContain('“Move out (vacate)” on 2026-10-06 (in 5 days)');
    expect(briefing.plainSummary).toContain('$1,925.00');
    expect(briefing.plainSummary).toContain('3 instructions directed at you');
    expect(briefing.keyPoints.length).toBeGreaterThanOrEqual(3);
    expect(briefing.keyPoints.length).toBeLessThanOrEqual(6);
    expect(briefing.keyPoints[0]).toBe('Document type: an eviction notice (confidence 94%).');
    expect(briefing.keyPoints).toContain('Amounts mentioned: $1,850.00, $75.00, $1,925.00.');
    expect(briefing.keyPoints).toContain('Duties placed on you: 3.');
    expect(briefing.optionNotes.map((note) => note.optionId)).toEqual(
      core.options.map((option) => option.id),
    );
    expect(briefing.optionNotes[0]?.whatItMeansForYou).toContain('Urgency: act within days.');
    expect(briefing.checklist.slice(0, 2)).toEqual([
      { id: 'ck-0', text: 'By 2026-10-06: Move out (vacate).', relatedDeadlineId: 'dl-0' },
      { id: 'ck-1', text: 'By 2026-10-06: Pay the amount demanded.', relatedDeadlineId: 'dl-1' },
    ]);
    expect(briefing.checklist.at(-1)?.relatedDeadlineId).toBeNull();
    expect(briefing.prepSheet.questionsForProfessional.length).toBeGreaterThanOrEqual(4);
    expect(briefing.prepSheet.documentsToGather.length).toBeGreaterThanOrEqual(4);
    expect(briefing.prepSheet.factsToWriteDown.length).toBeGreaterThanOrEqual(3);
    expect(briefing.termsExplained.map((term) => term.term)).toEqual([
      'unlawful detainer',
      'premises',
      'calendar days',
      'legal aid',
    ]);
  });

  it('degrades gracefully for an unknown document with nothing extracted', () => {
    const briefing = buildFallbackBriefing(emptyCore());
    expect(briefing.whatThisIs).toMatch(/^We could not tell what kind of document this is/);
    expect(briefing.plainSummary).toContain('We did not find a specific deadline');
    expect(briefing.plainSummary).not.toContain('largest amount');
    expect(briefing.keyPoints).toEqual([
      'Document type: not recognised from its wording.',
      '0 deadlines found. We did not find a specific deadline; read the document carefully for one.',
      '3 common paths to consider are listed below.',
      'Deadlines are counted in calendar days; confirm them with the issuing body.',
    ]);
    expect(briefing.optionNotes).toHaveLength(3);
    expect(briefing.optionNotes[2]?.whatItMeansForYou).toContain('Urgency: act within weeks.');
    expect(briefing.checklist).toHaveLength(2);
    expect(briefing.termsExplained.map((term) => term.term)).toEqual([
      'calendar days',
      'legal aid',
    ]);
    expect(briefing.prepSheet.questionsForProfessional[0]).toBe('What kind of document is this?');
  });

  it('describes undated deadlines, past dates, and hedged confidence', () => {
    const core = emptyCore({
      classification: { kind: 'demand_letter', confidence: 0.6, signals: ['legal action'] },
      deadlines: [undated('respond', 'File a written response')],
      obligations: [
        { id: 'ob-0', text: 'Reply in writing', party: 'you', sourceText: 'You must reply.' },
        { id: 'ob-1', text: 'The sender will sue', party: 'sender', sourceText: 'We will sue.' },
      ],
      options: getOptions('demand_letter'),
    });
    const briefing = buildFallbackBriefing(core);
    expect(briefing.whatThisIs).toMatch(/^This is probably a demand letter/);
    expect(briefing.plainSummary).toContain(
      'The document asks for action immediately but does not give a specific date.',
    );
    expect(briefing.plainSummary).toContain('1 instruction directed at you');
    expect(briefing.checklist[0]).toEqual({
      id: 'ck-0',
      text: 'File a written response as soon as possible (no date given).',
      relatedDeadlineId: 'dl-0',
    });
    expect(briefing.checklist[1]?.text).toBe('Reply in writing.');
    expect(briefing.termsExplained[0]?.term).toBe('legal action');
    expect(briefing.optionNotes.at(-1)?.whatItMeansForYou).toContain(
      'Urgency: no immediate rush, but keep it in mind.',
    );

    const low = buildFallbackBriefing(
      emptyCore({
        classification: { kind: 'court_summons', confidence: 0.4, signals: ['summons'] },
      }),
    );
    expect(low.whatThisIs).toMatch(/^This may be a court summons/);
  });

  it('lists at most five duties and three amounts', () => {
    const duties = Array.from({ length: 7 }, (_, i) => ({
      id: `ob-${String(i)}`,
      text: `Duty ${String(i)}`,
      party: 'you' as const,
      sourceText: `You must do duty ${String(i)}.`,
    }));
    const amounts = Array.from({ length: 5 }, (_, i) => ({
      id: `amt-${String(i)}`,
      amount: (i + 1) * 100,
      currency: 'USD' as const,
      context: `Fee ${String(i)} of $${String((i + 1) * 100)}.`,
    }));
    const briefing = buildFallbackBriefing(emptyCore({ obligations: duties, amounts }));
    expect(briefing.checklist).toHaveLength(7);
    expect(briefing.keyPoints).toContain('Amounts mentioned: $100.00, $200.00, $300.00.');
    expect(briefing.plainSummary).toContain('The largest amount mentioned is $500.00.');
  });
});

describe('describe helpers', () => {
  it('pluralises, formats money, and describes day offsets', () => {
    expect(plural(1, 'day')).toBe('1 day');
    expect(plural(2, 'day')).toBe('2 days');
    expect(formatMoney(1234.5)).toBe('$1,234.50');
    expect(describeDays(-1)).toBe('1 day ago');
    expect(describeDays(0)).toBe('today');
    expect(describeDays(12)).toBe('in 12 days');
  });
});

describe('buildFallbackAnswer', () => {
  const text = String(SAMPLE_NOTICES[0]?.text);
  const core = analyzeDocument(text, reference);

  it('quotes the best-matching sentences and adds the soonest deadline for timing questions', () => {
    const answer = buildFallbackAnswer('When do I have to pay the rent?', core, text);
    expect(answer.grounded).toBe(true);
    expect(answer.source).toBe('fallback');
    expect(answer.citations.length).toBeGreaterThan(0);
    expect(answer.citations.length).toBeLessThanOrEqual(3);
    expect(answer.citations[0]).toContain('If you fail to pay the full amount');
    expect(answer.answer).toContain(
      'The soonest deadline we found is “Move out (vacate)” on 2026-10-06',
    );
    expect(answer.answer).toContain('not legal advice');
  });

  it('omits the deadline hint for non-timing questions and when no dated deadline exists', () => {
    const answer = buildFallbackAnswer('Who is the landlord?', core, text);
    expect(answer.grounded).toBe(true);
    expect(answer.answer).not.toContain('soonest deadline');
    const noDates = buildFallbackAnswer('When is rent due?', emptyCore(), 'Rent is due monthly.');
    expect(noDates.grounded).toBe(true);
    expect(noDates.answer).not.toContain('soonest deadline');
  });

  it('refers the user onward when nothing in the document matches', () => {
    const answer = buildFallbackAnswer('Can I bring my parrot?', core, text);
    expect(answer).toEqual({
      answer: expect.stringMatching(
        /^I could not find anything in the document about that\./,
      ) as string,
      grounded: false,
      citations: [],
      source: 'fallback',
    });
    expect(answer.answer).toContain('legal-aid organisation or licensed legal professional');
    expect(buildFallbackAnswer('is it?', core, text).grounded).toBe(false);
  });

  it('clips long citations to 200 characters', () => {
    const answer = buildFallbackAnswer('What must I pay the landlord?', core, text);
    for (const citation of answer.citations) expect(citation.length).toBeLessThanOrEqual(200);
  });
});
