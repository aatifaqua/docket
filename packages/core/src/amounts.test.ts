import { describe, expect, it } from 'vitest';
import { extractAmounts } from './amounts.ts';

describe('extractAmounts', () => {
  it('parses dollar signs and written dollars with the sentence as context', () => {
    const text =
      'You owe $1,250.00 in rent plus a $75 late fee. ' +
      'The deposit was 1,500 dollars and 20.50 US Dollars was refunded. ' +
      'Call $ 300 the office.';
    const result = extractAmounts(text);
    expect(result.map((item) => [item.id, item.amount, item.currency])).toEqual([
      ['amt-0', 1250, 'USD'],
      ['amt-1', 75, 'USD'],
      ['amt-2', 1500, 'USD'],
      ['amt-3', 20.5, 'USD'],
      ['amt-4', 300, 'USD'],
    ]);
    expect(result[0]?.context).toBe('You owe $1,250.00 in rent plus a $75 late fee.');
    expect(result[2]?.context).toBe(
      'The deposit was 1,500 dollars and 20.50 US Dollars was refunded.',
    );
  });

  it('skips repeated amounts within one sentence but keeps them across sentences', () => {
    const text = 'Pay $500 now; the $500 covers March. The $500 was never paid.';
    expect(extractAmounts(text).map((item) => item.amount)).toEqual([500, 500]);
  });

  it('clips long context and caps the number of amounts', () => {
    const text = `Fees: ${Array.from({ length: 40 }, (_, i) => `$${String(i + 1)}`).join(', ')}.`;
    const result = extractAmounts(text);
    expect(result).toHaveLength(30);
    expect(result[0]?.context.length).toBeLessThanOrEqual(160);
  });

  it('returns an empty list when no money is mentioned', () => {
    expect(extractAmounts('Please respond within 30 days.')).toEqual([]);
  });

  it('stops scanning once the cap is reached', () => {
    const text = Array.from(
      { length: 40 },
      (_, i) => `Fee ${String(i)} is $${String(i + 1)}.00.`,
    ).join(' ');
    expect(extractAmounts(text)).toHaveLength(30);
  });
});
