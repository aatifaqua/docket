import type { DocumentKind, PrepSheet } from './types.ts';

/** Kind-specific preparation for a conversation with a lawyer or legal-aid clinic. */
export const PREP_SHEETS: Readonly<Record<DocumentKind, PrepSheet>> = {
  eviction_notice: {
    questionsForProfessional: [
      'Was this notice served in the way the law here requires?',
      'How many days do I really have, counting weekends and holidays?',
      'If I pay the full amount now, can the landlord still evict me?',
      'Are there repairs or rent problems I can raise as a defence?',
      'Is emergency rental assistance available where I live?',
    ],
    documentsToGather: [
      'Your lease and any written changes to it',
      'Rent receipts, bank statements, or payment app history',
      'Every letter, text, or email from the landlord',
      'Photos of any repair problems and your requests about them',
      'The notice itself and the envelope it came in',
    ],
    factsToWriteDown: [
      'The date you actually received the notice and how it arrived',
      'The exact amount you believe you owe and why it differs, if it does',
      'Names and contact details of the landlord and property manager',
      'Any conversations about payment plans or moving out',
    ],
  },
  demand_letter: {
    questionsForProfessional: [
      'Is the amount demanded supported by the documents I have?',
      'What happens if I do not respond by the stated date?',
      'Should I respond myself or through a lawyer?',
      'Can I settle for a lower amount, and how should I make an offer?',
    ],
    documentsToGather: [
      'The demand letter and its envelope',
      'Any contract, invoice, or agreement it refers to',
      'Your payment records and correspondence with the sender',
      'Notes of any calls about the dispute',
    ],
    factsToWriteDown: [
      'The date you received the letter',
      'What you agree with and what you dispute in it',
      'Any earlier attempts to resolve the matter',
    ],
  },
  court_summons: {
    questionsForProfessional: [
      'When exactly is my answer due, and how do I file it?',
      'Was I served properly?',
      'What defences or counterclaims might I have?',
      'Can I get a fee waiver or free representation?',
      'What happens at the first hearing?',
    ],
    documentsToGather: [
      'The summons and the complaint that came with it',
      'Any contract, account statement, or notice mentioned in the complaint',
      'Proof of payments or communications related to the claim',
      'Proof of when and how you were served',
    ],
    factsToWriteDown: [
      'The case number, court name, and the date on the summons',
      'The date and manner in which you were served',
      'The amount claimed and anything you disagree with',
      'Dates of key events in the dispute',
    ],
  },
  debt_collection: {
    questionsForProfessional: [
      'Is this debt actually mine, and is the amount right?',
      'How do I dispute it in writing, and what happens after I do?',
      'Is the debt too old for the collector to sue on?',
      'Could paying anything restart the time limit?',
      'Is the collector allowed to contact me the way it has been?',
    ],
    documentsToGather: [
      'The collection letter and any earlier letters',
      'Statements from the original creditor',
      'Records of any payments on the account',
      'A recent copy of your credit report',
    ],
    factsToWriteDown: [
      'The date you received the letter and the dispute deadline',
      'The date of your last payment on the account',
      'Every call or message from the collector, with dates and times',
    ],
  },
  employment_notice: {
    questionsForProfessional: [
      'Does this notice follow the employer’s own policies?',
      'Could the reason given be a cover for discrimination or retaliation?',
      'What am I owed in final pay, unused leave, or benefits?',
      'Should I sign the severance or release, and by when?',
      'Are there agency complaint deadlines I need to know about?',
    ],
    documentsToGather: [
      'The notice, plus any earlier warnings or reviews',
      'Your offer letter, contract, and the employee handbook',
      'Recent pay stubs and benefits information',
      'Emails or messages relevant to the events described',
    ],
    factsToWriteDown: [
      'A dated timeline of the events the notice describes',
      'Names of people involved and any witnesses',
      'Any complaints you made before the notice arrived',
    ],
  },
  insurance_denial: {
    questionsForProfessional: [
      'What exact policy language is the denial based on?',
      'What is the appeal deadline, and what should the appeal include?',
      'Is an independent external review available for this claim?',
      'Is the amount in dispute worth professional help?',
    ],
    documentsToGather: [
      'The denial letter and the full policy',
      'The original claim and everything you submitted with it',
      'Estimates, invoices, or medical records supporting the claim',
      'Notes of every call with the adjuster',
    ],
    factsToWriteDown: [
      'The claim number, policy number, and date of the denial',
      'The date of the loss or service and when you filed the claim',
      'The amount claimed and the amount denied',
    ],
  },
  unknown: {
    questionsForProfessional: [
      'What kind of document is this?',
      'Does it create a deadline for me?',
      'Who sent it, and are they entitled to what they ask?',
      'What happens if I do nothing?',
    ],
    documentsToGather: [
      'The document and its envelope',
      'Any earlier letters from the same sender',
      'Any account, lease, or contract it seems to relate to',
      'Your notes on how and when it arrived',
    ],
    factsToWriteDown: [
      'The date you received it',
      'Every date, amount, and reference number it contains',
      'Anything about it that seems unusual',
    ],
  },
};
