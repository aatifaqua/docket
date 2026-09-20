import { describe, expect, it } from 'vitest';
import { MAX_INPUT_CHARS, MIN_INPUT_WORDS, countWords, sanitizeText } from './sanitize.ts';

describe('sanitizeText', () => {
  it('strips HTML tags and comments but keeps their text', () => {
    expect(sanitizeText('<p>Pay <b>now</b></p><!-- hidden --> a < b')).toBe('Pay  now    a < b');
  });

  it('removes control characters except tab and newline', () => {
    expect(sanitizeText('a\u0000b\u0007c\td\ne\u007Ff\u0085g')).toBe('abc\td\nefg');
  });

  it('normalises CRLF and collapses three or more blank lines', () => {
    expect(sanitizeText('one\r\ntwo\rthree\n\n\n\nfour\n \n\t\nfive')).toBe(
      'one\ntwo\nthree\n\nfour\n\nfive',
    );
  });

  it('trims and truncates to the maximum length', () => {
    expect(sanitizeText('  padded  ')).toBe('padded');
    expect(sanitizeText('x'.repeat(MAX_INPUT_CHARS + 10))).toHaveLength(MAX_INPUT_CHARS);
  });

  it('exposes the limits the rest of the app relies on', () => {
    expect(MAX_INPUT_CHARS).toBe(60_000);
    expect(MIN_INPUT_WORDS).toBe(40);
  });
});

describe('countWords', () => {
  it('counts whitespace-separated words and ignores empty input', () => {
    expect(countWords('one two\tthree\nfour')).toBe(4);
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });
});
