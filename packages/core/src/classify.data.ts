import type { DocumentKind } from './types.ts';

export type KnownKind = Exclude<DocumentKind, 'unknown'>;

export interface Signal {
  phrase: string;
  /** 3 = names the document type, 2 = strongly associated, 1 = common vocabulary. */
  weight: 1 | 2 | 3;
}

/**
 * Weighted phrase table per document kind. Phrases are matched case-insensitively on word
 * boundaries; a phrase counts once however often it appears, so long documents do not drown
 * out short ones.
 */
export const SIGNALS: Readonly<Record<KnownKind, readonly Signal[]>> = {
  eviction_notice: [
    { phrase: 'notice to quit', weight: 3 },
    { phrase: 'pay or quit', weight: 3 },
    { phrase: 'pay rent or quit', weight: 3 },
    { phrase: 'cure or quit', weight: 3 },
    { phrase: 'unlawful detainer', weight: 3 },
    { phrase: 'notice to vacate', weight: 3 },
    { phrase: 'eviction', weight: 3 },
    { phrase: 'vacate the premises', weight: 2 },
    { phrase: 'possession of the premises', weight: 2 },
    { phrase: 'holdover', weight: 2 },
    { phrase: 'landlord', weight: 1 },
    { phrase: 'tenant', weight: 1 },
    { phrase: 'lease', weight: 1 },
    { phrase: 'rent', weight: 1 },
  ],
  demand_letter: [
    { phrase: 'demand for payment', weight: 3 },
    { phrase: 'demand letter', weight: 3 },
    { phrase: 'cease and desist', weight: 3 },
    { phrase: 'formal demand', weight: 3 },
    { phrase: 'hereby demand', weight: 3 },
    { phrase: 'failure to comply', weight: 2 },
    { phrase: 'govern yourself accordingly', weight: 2 },
    { phrase: 'legal action', weight: 1 },
    { phrase: 'without further notice', weight: 1 },
    { phrase: 'settle this matter', weight: 1 },
    { phrase: 'hereby notified', weight: 1 },
  ],
  court_summons: [
    { phrase: 'summons', weight: 3 },
    { phrase: 'you are hereby summoned', weight: 3 },
    { phrase: 'civil action', weight: 2 },
    { phrase: 'plaintiff', weight: 2 },
    { phrase: 'defendant', weight: 2 },
    { phrase: 'clerk of the court', weight: 2 },
    { phrase: 'default judgment', weight: 2 },
    { phrase: 'file an answer', weight: 2 },
    { phrase: 'complaint', weight: 1 },
    { phrase: 'case number', weight: 1 },
    { phrase: 'superior court', weight: 1 },
    { phrase: 'district court', weight: 1 },
  ],
  debt_collection: [
    { phrase: 'validation notice', weight: 3 },
    { phrase: 'debt collector', weight: 3 },
    { phrase: 'fdcpa', weight: 3 },
    { phrase: 'fair debt collection', weight: 3 },
    { phrase: 'attempt to collect a debt', weight: 3 },
    { phrase: 'collection agency', weight: 3 },
    { phrase: 'dispute the debt', weight: 3 },
    { phrase: 'original creditor', weight: 3 },
    { phrase: 'verification of the debt', weight: 2 },
    { phrase: 'balance due', weight: 1 },
    { phrase: 'account number', weight: 1 },
    { phrase: 'credit reporting', weight: 1 },
  ],
  employment_notice: [
    { phrase: 'performance improvement plan', weight: 3 },
    { phrase: 'termination of employment', weight: 3 },
    { phrase: 'final written warning', weight: 3 },
    { phrase: 'last day of employment', weight: 3 },
    { phrase: 'written warning', weight: 2 },
    { phrase: 'your employment', weight: 2 },
    { phrase: 'human resources', weight: 2 },
    { phrase: 'severance', weight: 2 },
    { phrase: 'cobra', weight: 2 },
    { phrase: 'at-will', weight: 2 },
    { phrase: 'disciplinary action', weight: 2 },
    { phrase: 'insubordination', weight: 2 },
    { phrase: 'employee handbook', weight: 1 },
  ],
  insurance_denial: [
    { phrase: 'claim denied', weight: 3 },
    { phrase: 'claim has been denied', weight: 3 },
    { phrase: 'denial of benefits', weight: 3 },
    { phrase: 'adjuster', weight: 3 },
    { phrase: 'appeal rights', weight: 3 },
    { phrase: 'policyholder', weight: 2 },
    { phrase: 'policy number', weight: 2 },
    { phrase: 'claim number', weight: 2 },
    { phrase: 'not covered', weight: 2 },
    { phrase: 'exclusion', weight: 2 },
    { phrase: 'explanation of benefits', weight: 2 },
    { phrase: 'coverage', weight: 1 },
    { phrase: 'insured', weight: 1 },
  ],
};
