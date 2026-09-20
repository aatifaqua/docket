import type {
  Briefing,
  ChecklistItem,
  CoreAnalysis,
  OptionNote,
  Severity,
  TermExplained,
} from './types.ts';
import { GENERIC_TERMS, GLOSSARY, KIND_NAMES } from './fallback.data.ts';
import { PREP_SHEETS } from './fallback.prep.ts';
import {
  describeDeadline,
  formatMoney,
  largestAmount,
  plural,
  soonestDated,
} from './fallback.describe.ts';

export { buildFallbackAnswer } from './fallback.answer.ts';

const MAX_CHECKLIST_DUTIES = 5;
const MAX_LISTED_AMOUNTS = 3;

const URGENCY_WORDS: Readonly<Record<Severity, string>> = {
  critical: 'act within days',
  important: 'act within weeks',
  info: 'no immediate rush, but keep it in mind',
};

function confidenceLead(confidence: number): string {
  if (confidence >= 0.75) return 'This looks like';
  if (confidence >= 0.5) return 'This is probably';
  return 'This may be';
}

function whatThisIs(core: CoreAnalysis): string {
  const { kind, confidence, signals } = core.classification;
  const { name, description } = KIND_NAMES[kind];
  if (kind === 'unknown') {
    return `We could not tell what kind of document this is from its wording (${description}). It may still contain deadlines, so check the timeline and consider showing it to a professional.`;
  }
  const quoted = signals.map((signal) => `“${signal}”`).join(', ');
  return `${confidenceLead(confidence)} ${name}: ${description}. Wording that pointed to this: ${quoted}.`;
}

function deadlineSentence(core: CoreAnalysis): string {
  const soonest = soonestDated(core);
  if (soonest !== undefined)
    return `The soonest deadline we found is ${describeDeadline(soonest)}.`;
  if (core.deadlines.length > 0) {
    return 'The document asks for action immediately but does not give a specific date.';
  }
  return 'We did not find a specific deadline; read the document carefully for one.';
}

function plainSummary(core: CoreAnalysis): string {
  const parts = [
    `${confidenceLead(core.classification.confidence)} ${KIND_NAMES[core.classification.kind].name}.`,
    deadlineSentence(core),
  ];
  const largest = largestAmount(core);
  if (largest !== undefined) {
    parts.push(`The largest amount mentioned is ${formatMoney(largest.amount)}.`);
  }
  const duties = core.obligations.filter((obligation) => obligation.party === 'you').length;
  if (duties > 0) parts.push(`We found ${plural(duties, 'instruction')} directed at you.`);
  parts.push(
    'Confirm every date with the sender or court and get advice from a legal professional before acting.',
  );
  return parts.join(' ');
}

function keyPoints(core: CoreAnalysis): string[] {
  const { kind, confidence } = core.classification;
  const points = [
    kind === 'unknown'
      ? 'Document type: not recognised from its wording.'
      : `Document type: ${KIND_NAMES[kind].name} (confidence ${String(Math.round(confidence * 100))}%).`,
    `${plural(core.deadlines.length, 'deadline')} found. ${deadlineSentence(core)}`,
  ];
  if (core.amounts.length > 0) {
    const listed = core.amounts.slice(0, MAX_LISTED_AMOUNTS).map((amt) => formatMoney(amt.amount));
    points.push(`Amounts mentioned: ${listed.join(', ')}.`);
  }
  const duties = core.obligations.filter((obligation) => obligation.party === 'you');
  if (duties.length > 0) points.push(`Duties placed on you: ${String(duties.length)}.`);
  points.push(`${plural(core.options.length, 'common path')} to consider are listed below.`);
  points.push('Deadlines are counted in calendar days; confirm them with the issuing body.');
  return points;
}

function optionNotes(core: CoreAnalysis): OptionNote[] {
  return core.options.map((option) => ({
    optionId: option.id,
    whatItMeansForYou: `${option.summary} Urgency: ${URGENCY_WORDS[option.urgency]}. Typical next step: ${option.typicalNextStep}`,
  }));
}

function checklist(core: CoreAnalysis): ChecklistItem[] {
  const items: Omit<ChecklistItem, 'id'>[] = core.deadlines.map((deadline) => ({
    text:
      deadline.date === null
        ? `${deadline.label} as soon as possible (no date given).`
        : `By ${deadline.date}: ${deadline.label}.`,
    relatedDeadlineId: deadline.id,
  }));
  const duties = core.obligations.filter((obligation) => obligation.party === 'you');
  for (const duty of duties.slice(0, MAX_CHECKLIST_DUTIES)) {
    items.push({ text: `${duty.text}.`, relatedDeadlineId: null });
  }
  items.push(
    {
      text: 'Keep the original document and its envelope; the postmark shows when it was sent.',
      relatedDeadlineId: null,
    },
    { text: 'Write down the date you received it and how it arrived.', relatedDeadlineId: null },
  );
  return items.map((item, index) => ({ id: `ck-${String(index)}`, ...item }));
}

/**
 * Glossary limited to terms that actually occur in what the core saw (matched signals,
 * source sentences, amount contexts) plus two generic terms, so nothing unexplained appears.
 */
function termsExplained(core: CoreAnalysis): TermExplained[] {
  const corpus = [
    ...core.classification.signals,
    ...core.deadlines.map((deadline) => deadline.sourceText),
    ...core.obligations.map((obligation) => obligation.sourceText),
    ...core.amounts.map((amount) => amount.context),
  ]
    .join(' ')
    .toLowerCase();
  const present = GLOSSARY[core.classification.kind].filter((entry) =>
    corpus.includes(entry.term.toLowerCase()),
  );
  return [...present, ...GENERIC_TERMS];
}

/**
 * Builds a complete Briefing from the structured analysis alone. Used in mock mode and
 * whenever Gemini is unavailable, so every user always gets a full, grounded briefing.
 */
export function buildFallbackBriefing(core: CoreAnalysis): Briefing {
  const prep = PREP_SHEETS[core.classification.kind];
  return {
    whatThisIs: whatThisIs(core),
    plainSummary: plainSummary(core),
    keyPoints: keyPoints(core),
    optionNotes: optionNotes(core),
    checklist: checklist(core),
    prepSheet: {
      questionsForProfessional: [...prep.questionsForProfessional],
      documentsToGather: [...prep.documentsToGather],
      factsToWriteDown: [...prep.factsToWriteDown],
    },
    termsExplained: termsExplained(core),
  };
}
