import { describe, expect, it } from 'vitest';
import { capitalize, clip, splitSentences, squash, trimTrailingPunctuation } from './text.ts';

describe('splitSentences', () => {
  it('splits on sentence punctuation followed by a capital, digit or quote', () => {
    const text = 'Pay now. You have 5 days! Really? "Yes." 3 days remain.';
    expect(splitSentences(text)).toEqual([
      'Pay now.',
      'You have 5 days!',
      'Really?',
      '"Yes."',
      '3 days remain.',
    ]);
  });

  it('does not split abbreviations followed by lower-case text and splits on blank lines', () => {
    const text = 'Contact Mr. smith today.\n\nSecond paragraph\nwraps here';
    expect(splitSentences(text)).toEqual([
      'Contact Mr. smith today.',
      'Second paragraph wraps here',
    ]);
  });

  it('drops empty fragments', () => {
    expect(splitSentences('\n\n   \n\n')).toEqual([]);
  });
});

describe('squash, clip and capitalize', () => {
  it('collapses whitespace', () => {
    expect(squash('  a \n\t b  ')).toBe('a b');
  });

  it('clips long text with an ellipsis and leaves short text alone', () => {
    expect(clip('short', 10)).toBe('short');
    expect(clip('abcdefghij', 10)).toBe('abcdefghij');
    expect(clip('abcdefghijk', 10)).toBe('abcdefghi…');
    expect(clip('abcdefgh ijk', 10)).toBe('abcdefgh…');
  });

  it('capitalizes the first character only', () => {
    expect(capitalize('pay rent')).toBe('Pay rent');
    expect(capitalize('')).toBe('');
  });

  it('trims trailing punctuation and whitespace in one linear pass', () => {
    expect(trimTrailingPunctuation('pay now. ; , ')).toBe('pay now');
    expect(trimTrailingPunctuation('...')).toBe('');
    expect(trimTrailingPunctuation('')).toBe('');
    expect(trimTrailingPunctuation('a.b')).toBe('a.b');
  });
});
