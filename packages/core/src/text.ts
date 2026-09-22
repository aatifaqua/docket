/**
 * Small text helpers shared by every extractor.
 *
 * Rationale: one sentence splitter means deadlines, obligations, amounts and citations all
 * quote the same source sentence, so the UI can cross-reference them reliably.
 */

const SENTENCE_BREAK = /(?<=[.!?]["”')\]]?)\s+(?=[A-Z0-9"“(])|\n\s*\n/;

/** Collapses runs of whitespace into single spaces and trims the ends. */
export function squash(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Splits prose into sentences (or paragraphs when punctuation is missing), whitespace-normalised. */
export function splitSentences(text: string): string[] {
  return text
    .split(SENTENCE_BREAK)
    .map(squash)
    .filter((sentence) => sentence.length > 0);
}

const TRAILING_PUNCTUATION = new Set(['.', ';', ':', ',']);

function isTrailing(character: string): boolean {
  return TRAILING_PUNCTUATION.has(character) || character.trim() === '';
}

/**
 * Removes trailing punctuation and whitespace in linear time. A `[.;:,\s]+$` regex here
 * backtracks polynomially on long inputs, so every extractor should use this instead.
 */
export function trimTrailingPunctuation(text: string): string {
  let end = text.length;
  while (end > 0 && isTrailing(text.charAt(end - 1))) end -= 1;
  return text.slice(0, end);
}

/** Truncates to `max` characters, ending with an ellipsis so the cut is visible to the reader. */
export function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Upper-cases the first character so restated clauses read as sentences. */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
