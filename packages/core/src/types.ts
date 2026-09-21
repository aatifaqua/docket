/**
 * Shared domain types for Docket.
 *
 * Everything the user sees is derived from these structures. The deterministic core in
 * this package produces `CoreAnalysis`; the language model only rewrites and explains it
 * as a `Briefing`. Keeping the model out of the data path means no date, amount, or
 * option can be hallucinated.
 */

export type DocumentKind =
  | 'eviction_notice'
  | 'demand_letter'
  | 'court_summons'
  | 'debt_collection'
  | 'employment_notice'
  | 'insurance_denial'
  | 'unknown';

export type Severity = 'critical' | 'important' | 'info';

export type DeadlineKind = 'respond' | 'pay' | 'vacate' | 'appear' | 'appeal' | 'cure' | 'other';

export interface Deadline {
  /** Stable identifier in document order, e.g. `dl-0`. */
  id: string;
  kind: DeadlineKind;
  /** Short action label, e.g. "Respond to the court". */
  label: string;
  /** ISO calendar date (yyyy-mm-dd) when it could be resolved, otherwise null. */
  date: string | null;
  /** Whole days between the reference date and `date`; null when `date` is null. */
  daysFromReference: number | null;
  /** The sentence the deadline came from, trimmed to 240 characters. */
  sourceText: string;
  severity: Severity;
}

export interface Obligation {
  id: string;
  /** Plain restatement of the demand, e.g. "Pay $1,250 in back rent". */
  text: string;
  party: 'you' | 'sender';
  sourceText: string;
}

export interface MoneyAmount {
  id: string;
  amount: number;
  currency: 'USD';
  /** Surrounding clause that gives the number its meaning. */
  context: string;
}

export interface OptionPath {
  /** Catalogue key, e.g. `eviction-cure-and-stay`. */
  id: string;
  title: string;
  summary: string;
  pros: string[];
  cons: string[];
  typicalNextStep: string;
  urgency: Severity;
}

export interface Classification {
  kind: DocumentKind;
  /** 0.34 – 0.99 for a recognised kind; 0 for `unknown`. */
  confidence: number;
  /** Matched phrases that drove the decision, for transparency. */
  signals: string[];
}

export interface CoreAnalysis {
  /** ISO date relative deadlines were computed from. */
  referenceDate: string;
  classification: Classification;
  /** Sorted soonest first; undated deadlines last. */
  deadlines: Deadline[];
  obligations: Obligation[];
  amounts: MoneyAmount[];
  options: OptionPath[];
  wordCount: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  relatedDeadlineId: string | null;
}

export interface TermExplained {
  term: string;
  meaning: string;
}

export interface OptionNote {
  optionId: string;
  whatItMeansForYou: string;
}

export interface PrepSheet {
  questionsForProfessional: string[];
  documentsToGather: string[];
  factsToWriteDown: string[];
}

export interface Briefing {
  /** One or two plain-language sentences naming the document. */
  whatThisIs: string;
  /** At most ~120 words. */
  plainSummary: string;
  /** Three to six bullets. */
  keyPoints: string[];
  optionNotes: OptionNote[];
  checklist: ChecklistItem[];
  prepSheet: PrepSheet;
  termsExplained: TermExplained[];
}

export type BriefingSource = 'gemini' | 'fallback';

export interface Analysis {
  id: string;
  createdAt: string;
  core: CoreAnalysis;
  briefing: Briefing;
  source: BriefingSource;
  disclaimer: string;
}

export interface Answer {
  answer: string;
  /** False when the question could not be answered from the document. */
  grounded: boolean;
  /** Short quotes from the document that support the answer. */
  citations: string[];
  source: BriefingSource;
}

/** Shown on every view, returned in every API response, and embedded in every prompt. */
export const DISCLAIMER =
  'Docket explains documents in plain language so you can decide what to do next. It is general ' +
  'information only, not legal advice, and it can miss details that matter in your situation. ' +
  'Check every deadline with the court or sender that issued the document, and talk to a licensed ' +
  'lawyer or a legal-aid organisation before you act.';
