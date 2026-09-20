import { describe, expect, it } from 'vitest';
import { extractDeadlines } from './deadlines.ts';

const reference = '2026-03-01';

describe('extractDeadlines', () => {
  it('resolves absolute dates and maps trigger verbs to kinds and labels', () => {
    const text =
      'You must pay the balance on or before March 10, 2026. ' +
      'You must vacate the premises by 3/20/2026. ' +
      'You are required to appear at the hearing on 2026-04-02. ' +
      'File a written answer by close of business on 15 March 2026. ' +
      'You may request an appeal until April 30, 2026. ' +
      'Correct the violation by March 8, 2026. ' +
      'The lease term ends by March 31, 2026.';
    const result = extractDeadlines(text, reference);
    expect(result.map((item) => [item.kind, item.date, item.label])).toEqual([
      ['cure', '2026-03-08', 'Fix the violation (cure)'],
      ['pay', '2026-03-10', 'Pay the amount demanded'],
      ['respond', '2026-03-15', 'File a written response'],
      ['vacate', '2026-03-20', 'Move out (vacate)'],
      ['other', '2026-03-31', 'Deadline'],
      ['appear', '2026-04-02', 'Appear in court'],
      ['appeal', '2026-04-30', 'Request an appeal'],
    ]);
    expect(result.map((item) => item.daysFromReference)).toEqual([7, 9, 14, 19, 30, 32, 60]);
  });

  it('resolves relative windows written as digits, words, or both', () => {
    const text =
      'You have thirty (30) days from receipt to dispute the debt. ' +
      'Pay within 5 days. ' +
      'No later than fourteen days after service you must respond. ' +
      'Rent for the last 30 days remains unpaid.';
    const result = extractDeadlines(text, reference);
    expect(result.map((item) => [item.kind, item.date])).toEqual([
      ['pay', '2026-03-06'],
      ['respond', '2026-03-15'],
      ['respond', '2026-03-31'],
    ]);
  });

  it('creates one deadline per trigger kind in a sentence and de-duplicates repeats', () => {
    const text =
      'Within five days you must pay the rent or vacate the premises. ' +
      'If you fail to pay or vacate within 5 days the landlord will sue.';
    const result = extractDeadlines(text, reference);
    expect(result.map((item) => [item.id, item.kind, item.severity])).toEqual([
      ['dl-0', 'vacate', 'critical'],
      ['dl-1', 'pay', 'critical'],
    ]);
  });

  it('ignores dates that describe when the notice was issued or served', () => {
    const text =
      'This notice is dated March 1, 2026 and was served on you on 2/28/2026. ' +
      'As of March 1, 2026 you owe $50 and must pay by March 9, 2026.';
    expect(extractDeadlines(text, reference).map((item) => item.date)).toEqual(['2026-03-09']);
  });

  it('skips undirected sentences without a due cue, such as a letterhead date', () => {
    const text =
      'March 1, 2026\n\nThank you for your business.\n\nInterest accrues after 3/31/2026.';
    const result = extractDeadlines(text, reference);
    expect(result.map((item) => [item.kind, item.date])).toEqual([['other', '2026-03-31']]);
  });

  it('records an undated deadline for immediate demands with a trigger verb', () => {
    const text = 'You must respond immediately. Please call immediately.';
    const result = extractDeadlines(text, reference);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: 'respond',
      date: null,
      daysFromReference: null,
      severity: 'important',
    });
  });

  it('assigns severity from proximity and trims source text to 240 characters', () => {
    const filler = 'lorem ipsum '.repeat(30);
    const text = `You must pay ${filler}by April 20, 2026. Pay by March 20, 2026.`;
    const result = extractDeadlines(text, reference);
    expect(result.map((item) => item.severity)).toEqual(['important', 'info']);
    expect(result[1]?.sourceText.length).toBeLessThanOrEqual(240);
    expect(result[1]?.sourceText.endsWith('…')).toBe(true);
  });

  it('returns nothing for text without dates or windows', () => {
    expect(extractDeadlines('You must pay the rent soon. Thanks.', reference)).toEqual([]);
  });
});
