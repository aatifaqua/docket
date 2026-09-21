/**
 * Input normalisation shared by the server and the browser demo.
 *
 * Rationale: stripping markup and control characters before analysis removes a class of
 * injection and rendering problems, and capping length bounds the work every extractor does.
 */

export const MAX_INPUT_CHARS = 60_000;
export const MIN_INPUT_WORDS = 40;

const HTML_TAG_RE = /<\/?[a-zA-Z!][^>]*>/g;
/** Every Unicode control character except tab and newline, which carry layout. */
const CONTROL_CHAR_RE = /(?![\t\n])\p{Cc}/gu;
/** Invisible format characters (zero-width joiners, bidi overrides, byte-order marks) that can hide or reorder text. */
const FORMAT_CHAR_RE = /\p{Cf}/gu;
const EXTRA_BLANK_LINES_RE = /\n[ \t]*\n(?:[ \t]*\n)+/g;

/** Strips tags and control characters, normalises line endings, and caps the length. */
export function sanitizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(HTML_TAG_RE, ' ')
    .replace(CONTROL_CHAR_RE, '')
    .replace(FORMAT_CHAR_RE, '')
    .replace(EXTRA_BLANK_LINES_RE, '\n\n')
    .trim()
    .slice(0, MAX_INPUT_CHARS);
}

/** Counts whitespace-separated words; used for the minimum-length check. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}
