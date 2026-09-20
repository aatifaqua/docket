import type { Answer, CoreAnalysis } from './types.ts';
import { describeDeadline, soonestDated } from './fallback.describe.ts';
import { clip, splitSentences } from './text.ts';

const MAX_CITATIONS = 3;
const CITATION_MAX = 200;
const MIN_KEYWORD_LENGTH = 3;

const STOP_WORDS = new Set(
  (
    'the and what when does this that with have from about will are can for you how why who ' +
    'should would could there which into they them their than then been being were was not ' +
    'but any all one out get has had did its mean means happen happens need still really ' +
    'letter document notice say says'
  ).split(' '),
);
const TIMING_QUESTION_RE = /\b(when|deadline|date|days|how long|due|until|soon)\b/i;

const REFERRAL =
  'A legal-aid organisation or licensed legal professional can answer questions the ' +
  'document itself does not, and can confirm what applies where you live.';

function keywords(question: string): string[] {
  const words = question
    .toLowerCase()
    .split(/[^a-z0-9$]+/)
    .filter((word) => word.length >= MIN_KEYWORD_LENGTH && !STOP_WORDS.has(word));
  return [...new Set(words)];
}

function rankSentences(text: string, words: string[]): string[] {
  return splitSentences(text)
    .map((sentence) => {
      const lower = sentence.toLowerCase();
      return { sentence, score: words.filter((word) => lower.includes(word)).length };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.sentence.length - a.sentence.length)
    .slice(0, MAX_CITATIONS)
    .map((entry) => clip(entry.sentence, CITATION_MAX));
}

/**
 * Answers a follow-up question by quoting the document sentences that share the most
 * keywords with it. Never invents facts: when nothing matches it says so and refers the
 * user to a professional with `grounded: false`.
 */
export function buildFallbackAnswer(question: string, core: CoreAnalysis, text: string): Answer {
  const citations = rankSentences(text, keywords(question));
  if (citations.length === 0) {
    return {
      answer: `I could not find anything in the document about that. ${REFERRAL}`,
      grounded: false,
      citations: [],
      source: 'fallback',
    };
  }
  const soonest = soonestDated(core);
  const timing =
    TIMING_QUESTION_RE.test(question) && soonest !== undefined
      ? ` The soonest deadline we found is ${describeDeadline(soonest)}.`
      : '';
  return {
    answer: `The document says: “${String(citations[0])}”${timing} This is general information taken from the document, not legal advice.`,
    grounded: true,
    citations,
    source: 'fallback',
  };
}
