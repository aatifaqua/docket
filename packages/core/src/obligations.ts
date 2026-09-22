import type { Obligation } from './types.ts';
import { capitalize, clip, splitSentences } from './text.ts';

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

const TRAILING_PUNCTUATION = new Set(['.', ';', ':', ',']);

/** Linear trailing trim; a `[...]+$` regex here would backtrack polynomially on long clauses. */
function trimTrailing(clause: string): string {
  let end = clause.length;
  while (end > 0) {
    const last = clause.charAt(end - 1);
    if (!TRAILING_PUNCTUATION.has(last) && last.trim() !== '') break;
    end -= 1;
  }
  return clause.slice(0, end);
}

function restate(clause: string): string {
  return clip(capitalize(trimTrailing(clause)), TEXT_MAX);
}

function senderVerb(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^intend to$/, 'intends to')
    .replace(/^reserve the right to$/, 'reserves the right to')
    .replace(/^shall$/, 'will');
}

function obligationFor(sentence: string): Omit<Obligation, 'id'> | null {
  const youLead = YOU_LEAD_RE.exec(sentence);
  if (youLead !== null) {
    const clause = sentence.slice(youLead.index + youLead[0].length);
    return { text: restate(clause), party: 'you', sourceText: clip(sentence, SOURCE_MAX) };
  }
  const senderLead = SENDER_LEAD_RE.exec(sentence);
  if (senderLead !== null) {
    const clause = sentence.slice(senderLead.index + senderLead[0].length);
    const text = restate(`The sender ${senderVerb(String(senderLead[2]))} ${clause}`);
    return { text, party: 'sender', sourceText: clip(sentence, SOURCE_MAX) };
  }
  if (YOU_CUE_RE.test(sentence)) {
    return { text: restate(sentence), party: 'you', sourceText: clip(sentence, SOURCE_MAX) };
  }
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
