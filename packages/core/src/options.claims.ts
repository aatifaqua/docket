import type { OptionPath } from './types.ts';

/**
 * Options for court papers, collection letters, insurance denials, and unrecognised
 * documents. Wording is generic and jurisdiction-neutral; every entry is information about a
 * common path, not a recommendation.
 */
export const CLAIM_OPTIONS: Readonly<
  Record<
    'court_summons' | 'debt_collection' | 'insurance_denial' | 'unknown',
    readonly OptionPath[]
  >
> = {
  // Pattern reflects general civil procedure: answer deadlines, default judgments, extensions.
  court_summons: [
    {
      id: 'court_summons-file-answer',
      title: 'File a written answer with the court',
      summary:
        'A summons usually gives a fixed number of days to file a written answer; filing on time keeps your right to be heard.',
      pros: [
        'Preserves your defences',
        'Prevents an automatic loss',
        'Court self-help centres often provide forms',
      ],
      cons: ['Strict deadline and format rules', 'A filing fee may apply, though waivers exist'],
      typicalNextStep:
        'Find the answer deadline on the summons and the court self-help centre for the form.',
      urgency: 'critical',
    },
    {
      id: 'court_summons-request-extension',
      title: 'Ask for more time',
      summary:
        'Courts typically allow a short extension if you ask before the deadline, sometimes by agreement with the other side.',
      pros: ['More time to find help', 'Often granted for a first request'],
      cons: ['Must be requested before the deadline', 'Not guaranteed'],
      typicalNextStep:
        'Contact the plaintiff or their lawyer in writing and confirm any agreement with the court.',
      urgency: 'important',
    },
    {
      id: 'court_summons-consult-counsel',
      title: 'Talk to a lawyer or legal aid before the deadline',
      summary:
        'A professional can spot defences, counterclaims, or service problems that are hard to see without training.',
      pros: [
        'Identifies defences you may not know about',
        'Legal aid is free for those who qualify',
        'Bar referral services offer low-cost consultations',
      ],
      cons: ['Appointments may take days', 'Private counsel costs money'],
      typicalNextStep:
        'Bring the summons, the complaint, and any related papers to the first meeting.',
      urgency: 'critical',
    },
    {
      id: 'court_summons-understand-default',
      title: 'Understand what happens if you do nothing',
      summary:
        'If no answer is filed, the plaintiff can usually ask for a default judgment for the full amount claimed plus costs.',
      pros: ['No filing fee or court appearance'],
      cons: [
        'A judgment can be entered without your side being heard',
        'Wage garnishment or liens may follow',
        'Undoing a default is difficult',
      ],
      typicalNextStep: 'Treat the answer deadline as firm and get help before it passes.',
      urgency: 'critical',
    },
  ],
  // Pattern reflects the federal Fair Debt Collection Practices Act validation-period model.
  debt_collection: [
    {
      id: 'debt_collection-dispute-in-writing',
      title: 'Dispute the debt in writing within the validation window',
      summary:
        'A written dispute sent within the validation period generally requires the collector to pause and verify the debt.',
      pros: [
        'Pauses collection until verification is sent',
        'Creates a dated record',
        'Catches mistaken identity and wrong amounts',
      ],
      cons: ['Must be in writing and on time', 'Does not erase a valid debt'],
      typicalNextStep:
        'Send a dated dispute letter by a method that proves delivery and keep a copy.',
      urgency: 'important',
    },
    {
      id: 'debt_collection-request-verification',
      title: 'Ask for verification and the original creditor',
      summary:
        'You can ask who the original creditor was and for documents showing the amount and that the collector may collect it.',
      pros: [
        'Shows whether the collector actually holds the debt',
        'Reveals fees added along the way',
      ],
      cons: ['Verification can take weeks', 'The debt does not go away while you wait'],
      typicalNextStep: 'Include the request in the same letter as your dispute.',
      urgency: 'important',
    },
    {
      id: 'debt_collection-negotiate-payment',
      title: 'Negotiate a payment or settlement',
      summary:
        'Collectors often accept less than the full balance or a payment plan, especially on older debts.',
      pros: ['Can reduce the total', 'Stops collection contact once agreed'],
      cons: [
        'A payment can restart the time limit for suing in some places',
        'Settled debts may still show on credit reports',
      ],
      typicalNextStep: 'Get any settlement offer in writing before sending money.',
      urgency: 'info',
    },
    {
      id: 'debt_collection-check-time-limit',
      title: 'Check whether the debt is too old to sue on',
      summary:
        'Every place sets a time limit for suing on a debt; a collector may still ask you to pay after it passes but usually cannot win in court.',
      pros: ['A strong defence if a lawsuit is filed', 'Helps decide whether to pay'],
      cons: [
        'Time limits vary and are easy to misjudge',
        'Acknowledging the debt can restart the clock',
      ],
      typicalNextStep:
        'Note the date of the last payment and ask a professional about the time limit.',
      urgency: 'info',
    },
  ],
  // Pattern reflects standard insurer appeal processes and state insurance-department complaints.
  insurance_denial: [
    {
      id: 'insurance_denial-internal-appeal',
      title: 'File an internal appeal',
      summary:
        'Denial letters usually describe an appeal process with a deadline; appeals with new documentation are often successful.',
      pros: [
        'Required before most outside reviews',
        'Adding records or a provider letter can change the result',
      ],
      cons: ['Deadlines are often 60 to 180 days', 'Reviewed by the same company'],
      typicalNextStep:
        'Find the appeal deadline in the letter and request the specific reason for denial in writing.',
      urgency: 'important',
    },
    {
      id: 'insurance_denial-request-claim-file',
      title: 'Request the claim file and the policy language',
      summary:
        'Policyholders can usually ask for the adjuster notes and the exact policy clause the denial relies on.',
      pros: ['Shows the real basis for the decision', 'Needed to write a focused appeal'],
      cons: ['Insurers may take weeks to respond', 'Policy language can be hard to read'],
      typicalNextStep: 'Send a written request citing the claim number.',
      urgency: 'important',
    },
    {
      id: 'insurance_denial-external-review',
      title: 'Seek an external review or a regulator complaint',
      summary:
        'After an internal appeal, many claims can go to an independent reviewer or a state insurance regulator.',
      pros: ['Independent of the insurer', 'Usually free'],
      cons: [
        'Generally requires finishing the internal appeal first',
        'Has its own filing deadline',
      ],
      typicalNextStep:
        'Keep every letter and date from the internal appeal so the record is complete.',
      urgency: 'info',
    },
    {
      id: 'insurance_denial-consult-professional',
      title: 'Talk to a lawyer or public adjuster',
      summary:
        'For large or complex claims, a lawyer or licensed public adjuster can value the loss and handle the dispute.',
      pros: ['Experience with insurer tactics', 'Often paid only from what is recovered'],
      cons: ['Fees reduce the payout', 'Not worthwhile for small claims'],
      typicalNextStep:
        'Total the amount in dispute before deciding whether professional help is worth it.',
      urgency: 'info',
    },
  ],
  // Generic paths that apply to any official-looking letter.
  unknown: [
    {
      id: 'unknown-identify-sender',
      title: 'Confirm who sent it and why',
      summary:
        'Look for a sender name, address, reference number, and the reason for writing; contact the sender through an independently verified channel.',
      pros: ['Rules out scams', 'Clarifies what is actually being asked'],
      cons: ['Takes a little time', 'Contact details in the letter itself may not be trustworthy'],
      typicalNextStep:
        'Look up the sender independently rather than using the phone number in the letter.',
      urgency: 'important',
    },
    {
      id: 'unknown-record-dates-and-amounts',
      title: 'Write down every date and amount',
      summary:
        'Even an unclear letter may contain a deadline; listing every date and figure makes it easier to get help quickly.',
      pros: ['Nothing gets missed', 'Speeds up any later conversation with a professional'],
      cons: ['Does not tell you what the letter means on its own'],
      typicalNextStep: 'Use the timeline below and add anything the extractor did not catch.',
      urgency: 'important',
    },
    {
      id: 'unknown-seek-help',
      title: 'Bring it to a legal-aid clinic or lawyer',
      summary:
        'A professional can identify the document in minutes and tell you whether a deadline applies.',
      pros: ['Fast identification', 'Free options exist in most areas'],
      cons: ['May need an appointment'],
      typicalNextStep: 'Bring the original letter, the envelope, and your notes.',
      urgency: 'important',
    },
  ],
};
