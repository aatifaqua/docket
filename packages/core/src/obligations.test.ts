import { describe, expect, it } from 'vitest';
import { extractObligations } from './obligations.ts';

describe('extractObligations', () => {
  it('restates "you must" style demands for the reader', () => {
    const text =
      'You must pay $1,250 in back rent by Friday. ' +
      'You are required to file an answer with the clerk. ' +
      'You shall keep the premises clean; ' +
      'You are hereby ordered to appear.';
    const result = extractObligations(text);
    expect(result.map((item) => [item.id, item.party, item.text])).toEqual([
      ['ob-0', 'you', 'Pay $1,250 in back rent by Friday'],
      ['ob-1', 'you', 'File an answer with the clerk'],
      ['ob-2', 'you', 'Keep the premises clean; You are hereby ordered to appear'],
    ]);
    expect(result[0]?.sourceText).toBe('You must pay $1,250 in back rent by Friday.');
  });

  it('attributes "we will" and "the landlord may" sentences to the sender', () => {
    const text =
      'If you do not pay, we will file suit. ' +
      'The landlord may enter the unit. ' +
      'Our office intends to report the account. ' +
      'We reserve the right to add fees. ' +
      'The company shall withhold final pay.';
    expect(extractObligations(text).map((item) => [item.party, item.text])).toEqual([
      ['sender', 'The sender will file suit'],
      ['sender', 'The sender may enter the unit'],
      ['sender', 'The sender intends to report the account'],
      ['sender', 'The sender reserves the right to add fees'],
      ['sender', 'The sender will withhold final pay'],
    ]);
  });

  it('keeps weaker duty cues as obligations on the reader, quoting the sentence', () => {
    const text =
      'Failure to respond will result in a default judgment. ' +
      'Payment must be received by the due date. ' +
      'Thank you for your attention.';
    expect(extractObligations(text).map((item) => [item.party, item.text])).toEqual([
      ['you', 'Failure to respond will result in a default judgment'],
      ['you', 'Payment must be received by the due date'],
    ]);
  });

  it('truncates long restatements and caps the total count', () => {
    const long = `You must ${'do the thing '.repeat(20)}now.`;
    const first = extractObligations(long)[0];
    expect(first?.text.length).toBeLessThanOrEqual(160);
    expect(first?.text.endsWith('…')).toBe(true);
    const many = Array.from({ length: 30 }, (_, i) => `You must pay item ${String(i)}.`).join(' ');
    expect(extractObligations(many)).toHaveLength(25);
  });

  it('stops scanning once the cap is reached', () => {
    const text = Array.from({ length: 40 }, (_, i) => `You must pay item ${String(i)}.`).join(' ');
    expect(extractObligations(text)).toHaveLength(25);
  });

  it('trims trailing punctuation without a backtracking regex, even for punctuation-only clauses', () => {
    expect(extractObligations('You must pay the rent now.;, ')[0]?.text).toBe('Pay the rent now');
    expect(extractObligations('You must ...')[0]?.text).toBe('');
  });
});
