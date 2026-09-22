import type { CoreAnalysis } from './types.ts';
import { classifyDocument } from './classify.ts';
import { isIsoDate } from './dates.ts';
import { extractDeadlinesFromSentences } from './deadlines.ts';
import { extractObligationsFromSentences } from './obligations.ts';
import { extractAmountsFromSentences } from './amounts.ts';
import { getOptions } from './options.ts';
import { MAX_INPUT_CHARS, MIN_INPUT_WORDS, countWords, sanitizeText } from './sanitize.ts';
import { splitSentences } from './text.ts';

export interface AnalyzeOptions {
  /** Set when the caller already ran `sanitizeText`, so the pass is not repeated. */
  sanitized?: boolean;
}

export type CoreErrorCode = 'TOO_SHORT' | 'TOO_LONG' | 'INVALID_DATE';

const MESSAGES: Readonly<Record<CoreErrorCode, string>> = {
  TOO_SHORT: `Please paste at least ${String(MIN_INPUT_WORDS)} words so the document can be analysed.`,
  TOO_LONG: `The document is longer than ${String(MAX_INPUT_CHARS)} characters. Please shorten it.`,
  INVALID_DATE: 'The reference date must be a real calendar date written as yyyy-mm-dd.',
};

/** Typed rejection so callers can show a specific plain-language message instead of a stack. */
export class CoreError extends Error {
  readonly code: CoreErrorCode;

  constructor(code: CoreErrorCode) {
    super(MESSAGES[code]);
    this.name = 'CoreError';
    this.code = code;
  }
}

/**
 * Runs the whole deterministic pipeline: validate, sanitise, classify, extract, and attach
 * the options catalogue. Length is checked on the raw input so an over-long document is
 * reported to the user rather than silently truncated. The text is sanitised at most once
 * and split into sentences exactly once; every extractor works from that shared pass.
 */
export function analyzeDocument(
  text: string,
  referenceDate: string,
  { sanitized = false }: AnalyzeOptions = {},
): CoreAnalysis {
  if (text.length > MAX_INPUT_CHARS) throw new CoreError('TOO_LONG');
  if (!isIsoDate(referenceDate)) throw new CoreError('INVALID_DATE');
  const clean = sanitized ? text : sanitizeText(text);
  const wordCount = countWords(clean);
  if (wordCount < MIN_INPUT_WORDS) throw new CoreError('TOO_SHORT');
  const classification = classifyDocument(clean);
  const sentences = splitSentences(clean);
  return {
    referenceDate,
    classification,
    deadlines: extractDeadlinesFromSentences(sentences, referenceDate),
    obligations: extractObligationsFromSentences(sentences),
    amounts: extractAmountsFromSentences(sentences),
    options: getOptions(classification.kind),
    wordCount,
  };
}
