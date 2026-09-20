import type { DocumentKind, TermExplained } from './types.ts';

/** Plain-language name and one-line description per kind, used in "What this is". */
export const KIND_NAMES: Readonly<Record<DocumentKind, { name: string; description: string }>> = {
  eviction_notice: {
    name: 'an eviction notice',
    description:
      'a notice from a landlord saying you must pay, fix something, or move out by a set time',
  },
  demand_letter: {
    name: 'a demand letter',
    description:
      'a letter asking you to pay or do something, usually with a warning about legal action',
  },
  court_summons: {
    name: 'a court summons',
    description:
      'an official notice that a lawsuit has been filed against you and that you must respond',
  },
  debt_collection: {
    name: 'a debt-collection letter',
    description:
      'a letter from a collector about money it says you owe, with a window to dispute it',
  },
  employment_notice: {
    name: 'an employment notice',
    description: 'a warning, improvement plan, or termination notice from an employer',
  },
  insurance_denial: {
    name: 'an insurance claim denial',
    description:
      'a letter from an insurer refusing all or part of a claim and describing how to appeal',
  },
  unknown: {
    name: 'a document we could not identify',
    description: 'a letter whose type we could not tell from its wording',
  },
};

/** Glossary per kind; a term is shown only when it actually appears in the analysed text. */
export const GLOSSARY: Readonly<Record<DocumentKind, readonly TermExplained[]>> = {
  eviction_notice: [
    {
      term: 'pay or quit',
      meaning: 'Pay what the notice says you owe, or move out, by the deadline.',
    },
    {
      term: 'cure or quit',
      meaning: 'Fix the problem described in the notice, or move out, by the deadline.',
    },
    { term: 'unlawful detainer', meaning: 'The court case a landlord files to remove a tenant.' },
    {
      term: 'notice to quit',
      meaning: 'A notice telling a tenant to leave the property by a set date.',
    },
    { term: 'premises', meaning: 'The home or property the notice is about.' },
  ],
  demand_letter: [
    {
      term: 'cease and desist',
      meaning: 'A demand that you stop doing something and not start again.',
    },
    {
      term: 'without prejudice',
      meaning: 'The sender is not giving up any rights by writing the letter.',
    },
    { term: 'legal action', meaning: 'Filing a lawsuit or other court process.' },
  ],
  court_summons: [
    { term: 'summons', meaning: 'The official notice that you are being sued and must respond.' },
    {
      term: 'complaint',
      meaning: 'The document that explains what the other side claims you did.',
    },
    {
      term: 'default judgment',
      meaning: 'A decision against you made because you did not respond in time.',
    },
    { term: 'plaintiff', meaning: 'The person or company that started the lawsuit.' },
    { term: 'defendant', meaning: 'The person being sued; in this document, likely you.' },
    { term: 'answer', meaning: 'Your written response to the complaint, filed with the court.' },
  ],
  debt_collection: [
    {
      term: 'validation notice',
      meaning: 'The letter a collector must send describing the debt and your right to dispute it.',
    },
    { term: 'original creditor', meaning: 'The business you first owed the money to.' },
    {
      term: 'statute of limitations',
      meaning: 'The time limit after which a collector usually cannot win a lawsuit on the debt.',
    },
    {
      term: 'dispute',
      meaning: 'Telling the collector in writing that you disagree with the debt.',
    },
  ],
  employment_notice: [
    {
      term: 'performance improvement plan',
      meaning: 'A written plan listing what must change, by when, for you to keep your job.',
    },
    {
      term: 'at-will',
      meaning: 'Employment that either side can end at any time for a lawful reason.',
    },
    {
      term: 'severance',
      meaning:
        'Pay or benefits offered when employment ends, often in exchange for signing a release.',
    },
    {
      term: 'cobra',
      meaning:
        'A way to keep employer health coverage for a while after leaving, at your own cost.',
    },
  ],
  insurance_denial: [
    { term: 'adjuster', meaning: 'The insurer’s employee or contractor who evaluated your claim.' },
    { term: 'exclusion', meaning: 'A situation the policy says is not covered.' },
    { term: 'appeal', meaning: 'A formal request that the insurer reconsider the decision.' },
    {
      term: 'explanation of benefits',
      meaning: 'A statement showing what the insurer paid and what it did not.',
    },
  ],
  unknown: [],
};

/** Terms that help with any legal letter; at most two are added to the glossary. */
export const GENERIC_TERMS: readonly TermExplained[] = [
  {
    term: 'calendar days',
    meaning:
      'Every day counts, including weekends and holidays, unless the document says otherwise.',
  },
  {
    term: 'legal aid',
    meaning: 'Free or low-cost legal help for people who meet income or other criteria.',
  },
];
