import type { Obligation } from './types.ts';
import { capitalize, clip, splitSentences, trimTrailingPunctuation } from './text.ts';

const MAX_OBLIGATIONS = 25;
const TEXT_MAX = 160;
const SOURCE_MAX = 240;

/** "You must pay ..." style leads; the lookahead guarantees a non-empty clause follows. */
const YOU_LEAD_RE =
  /\byou (?:must|shall|are required to|are hereby required to|need to|have to|are directed to|are ordered to|are hereby (?:ordered|commanded|directed) to)\s+(?=\S)/i;
/** Weaker demand cues that still place a duty on the reader. */
const YOU_CUE_RE = /\b(failure to|shall|is required|are required|must be)\b/i;
const SENDER_LEAD_RE =
  /\b(we|our (?:office|client|firm|company)|the (?:landlord|plaintiff|company|employer|creditor|insurer|firm|agency|court|collector|owner|management))\s+(will|may|intend to|intends to|reserve the right to|reserves the right to|shall)\s+(?=\S)/i;

function restate(clause: string): string {
  return clip(capitalize(trimTrailingPunctuation(clause)), TEXT_MAX);
}

function senderVerb(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^intend to$/, 'intends to')
    .replace(/^reserve the right to$/, 'reserves the right to')
    .replace(/^shall$/, 'will');
}

/**
 * A lead such as "you must" or "the landlord will" followed by nothing but punctuation is a
 * heading for a list, not an obligation, so it is skipped rather than emitted as empty text.
 */
function obligationFor(sentence: string): Omit<Obligation, 'id'> | null {
  const sourceText = clip(sentence, SOURCE_MAX);
  const youLead = YOU_LEAD_RE.exec(sentence);
  const lead = youLead ?? SENDER_LEAD_RE.exec(sentence);
  if (lead !== null) {
    const clause = trimTrailingPunctuation(sentence.slice(lead.index + lead[0].length));
    if (clause === '') return null;
    if (youLead !== null) return { text: restate(clause), party: 'you', sourceText };
    const text = restate(`The sender ${senderVerb(String(lead[2]))} ${clause}`);
    return { text, party: 'sender', sourceText };
  }
  if (YOU_CUE_RE.test(sentence)) return { text: restate(sentence), party: 'you', sourceText };
  return null;
}

/**
 * Finds sentences that place a duty on the reader ("you must", "failure to", "shall") or
 * announce what the sender will do ("we will", "the landlord may") and restates each one
 * plainly, keeping the original sentence for reference.
 */
export function extractObligations(text: string): Obligation[] {
  return extractObligationsFromSentences(splitSentences(text));
}

/** Same extraction over sentences that were already split, so one pass serves every extractor. */
export function extractObligationsFromSentences(sentences: readonly string[]): Obligation[] {
  const found: Obligation[] = [];
  for (const sentence of sentences) {
    if (found.length >= MAX_OBLIGATIONS) break;
    const obligation = obligationFor(sentence);
    if (obligation !== null) found.push({ id: `ob-${String(found.length)}`, ...obligation });
  }
  return found;
}
