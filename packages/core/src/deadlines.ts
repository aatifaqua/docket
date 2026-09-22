import type { Deadline, DeadlineKind } from './types.ts';
import { addDays, daysBetween, findDates } from './dates.ts';
import { clip, splitSentences } from './text.ts';
import { buildTimeline, severityFor } from './timeline.ts';

const SOURCE_TEXT_MAX = 240;
const LOOKBEHIND_CHARS = 24;

interface Trigger {
  kind: DeadlineKind;
  label: string;
  pattern: RegExp;
}

/** Trigger verbs, checked per sentence; a sentence can create one deadline per matching kind. */
const TRIGGERS: readonly Trigger[] = [
  { kind: 'appear', label: 'Appear in court', pattern: /\b(appear|hearing|court date|trial)\b/i },
  {
    kind: 'vacate',
    label: 'Move out (vacate)',
    pattern: /\b(vacate|quit|move out|surrender|deliver (?:up )?possession)\b/i,
  },
  { kind: 'pay', label: 'Pay the amount demanded', pattern: /\b(pay|remit|payment)\b/i },
  {
    kind: 'respond',
    label: 'File a written response',
    pattern: /\b(answer|respond|response|reply|dispute)\b/i,
  },
  {
    kind: 'appeal',
    label: 'Request an appeal',
    pattern: /\b(appeal|reconsideration|request (?:a |an )?review)\b/i,
  },
  { kind: 'cure', label: 'Fix the violation (cure)', pattern: /\b(cure|remedy|correct|comply)\b/i },
];

const OTHER: Trigger = { kind: 'other', label: 'Deadline', pattern: /$^/ };

const NUMBER_WORDS: Readonly<Record<string, number>> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  ten: 10,
  fourteen: 14,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  sixty: 60,
  ninety: 90,
};

const WINDOW_RE =
  /\b(\d{1,3}|one|two|three|four|five|six|seven|ten|fourteen|fifteen|twenty|thirty|sixty|ninety)\s*(?:\(\d{1,3}\)\s*)?(?:calendar\s+|business\s+|court\s+)?days?\b/gi;
const WINDOW_CUE_RE =
  /\b(within|no later than|not later than|after|from|following|before|prior to|have|has|expires?)\b/i;
const IMMEDIATE_RE = /\b(immediately|upon receipt|promptly|at once|without delay)\b/i;
/** A sentence with no trigger verb counts as a deadline only when it is clearly about a due date. */
const DUE_CUE_RE =
  /\b(by|before|no later than|not later than|within|deadline|due|until|expires?|after)\b/i;
/** Dates introduced this way describe when the notice was made, not when something is due. */
const ISSUANCE_RE = /\b(dated|issued|signed|mailed|sent|received|served|filed|as of)\b[^.]{0,16}$/i;

interface SentenceDeadlines {
  sentence: string;
  date: string | null;
  triggers: readonly Trigger[];
  referenceDate: string;
  nextIndex: number;
}

function windowDays(match: RegExpExecArray): number {
  const word = String(match[1]).toLowerCase();
  return NUMBER_WORDS[word] ?? Number(word);
}

function isIssuanceDate(sentence: string, index: number): boolean {
  return ISSUANCE_RE.test(sentence.slice(Math.max(0, index - LOOKBEHIND_CHARS), index));
}

/** Resolves every due date in a sentence; `null` marks an "immediately" style deadline. */
function findAnchors(
  sentence: string,
  referenceDate: string,
  hasTrigger: boolean,
): (string | null)[] {
  const explicit = findDates(sentence)
    .filter((hit) => !isIssuanceDate(sentence, hit.index))
    .map((hit) => hit.iso);
  const relative = WINDOW_CUE_RE.test(sentence)
    ? [...sentence.matchAll(WINDOW_RE)].map((match) => addDays(referenceDate, windowDays(match)))
    : [];
  const anchors = [...explicit, ...relative];
  if (anchors.length === 0 && hasTrigger && IMMEDIATE_RE.test(sentence)) return [null];
  return anchors;
}

function buildDeadlines(input: SentenceDeadlines): Deadline[] {
  const { sentence, date, triggers, referenceDate, nextIndex } = input;
  const days = date === null ? null : daysBetween(referenceDate, date);
  const sourceText = clip(sentence, SOURCE_TEXT_MAX);
  return triggers.map((trigger, offset) => ({
    id: `dl-${String(nextIndex + offset)}`,
    kind: trigger.kind,
    label: trigger.label,
    date,
    daysFromReference: days,
    sourceText,
    severity: severityFor(trigger.kind, days),
  }));
}

/**
 * Extracts dated and relative deadlines sentence by sentence and returns them as a built
 * timeline (sorted, de-duplicated, severity assigned). Relative windows resolve against
 * `referenceDate` in calendar days; the model never supplies a date.
 */
export function extractDeadlines(text: string, referenceDate: string): Deadline[] {
  return extractDeadlinesFromSentences(splitSentences(text), referenceDate);
}

/** Same extraction over pre-split sentences, so the document is tokenised once per analysis. */
export function extractDeadlinesFromSentences(
  sentences: readonly string[],
  referenceDate: string,
): Deadline[] {
  const found: Deadline[] = [];
  for (const sentence of sentences) {
    const matched = TRIGGERS.filter((trigger) => trigger.pattern.test(sentence));
    if (matched.length === 0 && !DUE_CUE_RE.test(sentence)) continue;
    const triggers = matched.length > 0 ? matched : [OTHER];
    for (const date of findAnchors(sentence, referenceDate, matched.length > 0)) {
      found.push(
        ...buildDeadlines({ sentence, date, triggers, referenceDate, nextIndex: found.length }),
      );
    }
  }
  return buildTimeline(found, referenceDate);
}
