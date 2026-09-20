import type { OptionPath } from './types.ts';

/**
 * Options for notices that arrive before any court is involved: eviction notices, demand
 * letters and employment notices. Wording is generic and jurisdiction-neutral; every entry
 * is information about a common path, not a recommendation.
 */
export const NOTICE_OPTIONS: Readonly<
  Record<'eviction_notice' | 'demand_letter' | 'employment_notice', readonly OptionPath[]>
> = {
  // Pattern reflects HUD tenant guidance and typical state pay-or-quit / cure-or-quit statutes.
  eviction_notice: [
    {
      id: 'eviction_notice-pay-or-cure-and-stay',
      title: 'Pay or fix the problem and stay',
      summary:
        'Many pay-or-quit and cure-or-quit notices let a tenant stay by paying the full amount or fixing the issue before the notice period ends.',
      pros: [
        'Keeps your housing',
        'Usually stops a court case before it starts',
        'Avoids an eviction record',
      ],
      cons: [
        'Requires the full amount, often within days',
        'A landlord may refuse a partial payment',
        'Does not settle an underlying dispute',
      ],
      typicalNextStep:
        'Confirm the exact amount and deadline in writing, then pay in a way that leaves a record.',
      urgency: 'critical',
    },
    {
      id: 'eviction_notice-negotiate-move-out',
      title: 'Negotiate a move-out date',
      summary:
        'Tenants sometimes agree to leave by a set date in exchange for more time, a clean record, or help with moving costs.',
      pros: [
        'More time to find housing',
        'May avoid a court filing on your record',
        'Sometimes includes moving money',
      ],
      cons: ['You give up the home', 'Spoken deals are hard to enforce', 'The landlord may say no'],
      typicalNextStep:
        'Ask for any agreement in writing, signed by both sides, before you rely on it.',
      urgency: 'important',
    },
    {
      id: 'eviction_notice-contest-in-court',
      title: 'Contest the eviction in court',
      summary:
        'Tenants can usually raise defences such as an improper notice, repairs the landlord owed, or payments already made.',
      pros: [
        'A court checks whether the notice and process were valid',
        'Repair and payment records can be defences',
        'Buys time while the case is heard',
      ],
      cons: [
        'Court dates come fast and missing one can mean losing by default',
        'A judgment can appear on tenant screening reports',
        'Court rules are technical',
      ],
      typicalNextStep:
        'Contact a legal-aid office or tenant union before the response deadline on the notice.',
      urgency: 'critical',
    },
    {
      id: 'eviction_notice-seek-legal-aid',
      title: 'Get help from legal aid or a tenant union',
      summary:
        'Free or low-cost tenant services exist in many areas and know the local notice rules and rental-assistance programmes.',
      pros: [
        'Often free or low cost',
        'Knows local notice requirements',
        'May know emergency rental assistance',
      ],
      cons: ['Waiting lists can be long', 'Income limits may apply'],
      typicalNextStep:
        'Look up the tenant-rights hotline or legal-aid office for your county today.',
      urgency: 'important',
    },
  ],
  // Pattern reflects consumer-protection guidance and common pre-litigation practice.
  demand_letter: [
    {
      id: 'demand_letter-respond-in-writing',
      title: 'Respond in writing',
      summary:
        'A short, factual reply creates a record of your position and often opens a conversation before anyone files suit.',
      pros: [
        'Creates a record of your side',
        'May stop the matter escalating',
        'Lets you ask for proof of the claim',
      ],
      cons: ['Anything you write can be used later', 'A careless reply can admit fault'],
      typicalNextStep: 'Draft a brief reply and have a professional review it before you send it.',
      urgency: 'important',
    },
    {
      id: 'demand_letter-negotiate-settlement',
      title: 'Negotiate a settlement or payment plan',
      summary:
        'Many demands are resolved by agreeing a smaller amount, a payment schedule, or a specific action instead of going to court.',
      pros: [
        'Avoids court costs and time',
        'Can reduce the amount',
        'Terms can be tailored to what you can afford',
      ],
      cons: ['Usually means paying or doing something', 'Needs to be written down to be reliable'],
      typicalNextStep: 'Work out what you can realistically offer before you make contact.',
      urgency: 'important',
    },
    {
      id: 'demand_letter-dispute-and-request-proof',
      title: 'Dispute the claim and ask for documentation',
      summary:
        'If you believe the demand is wrong, you can say so and ask the sender to show the contract, invoices, or other basis for it.',
      pros: [
        'Forces the sender to substantiate the claim',
        'Buys time to gather your own records',
        'Some weak demands stop here',
      ],
      cons: ['Does not stop the sender from suing', 'The clock in the letter may keep running'],
      typicalNextStep:
        'Gather every document about the relationship and list the facts you dispute.',
      urgency: 'important',
    },
    {
      id: 'demand_letter-understand-risk-of-ignoring',
      title: 'Wait, but understand the risk',
      summary:
        'A demand letter is not a court order, but ignoring one can be followed by a lawsuit filed without further warning.',
      pros: ['No immediate cost', 'Some demands are never pursued'],
      cons: [
        'The sender may file suit without more notice',
        'You lose the chance to shape the outcome early',
      ],
      typicalNextStep:
        'Put the stated deadline on a calendar and talk to a professional before it passes.',
      urgency: 'info',
    },
  ],
  // Pattern reflects typical HR practice and general employee-rights guidance.
  employment_notice: [
    {
      id: 'employment_notice-respond-in-writing',
      title: 'Respond to the warning or plan in writing',
      summary:
        'Employees can usually add a written response to their file, correcting facts and noting their own account.',
      pros: [
        'Your version goes on the record',
        'Shows engagement with the process',
        'Useful if a dispute follows',
      ],
      cons: ['A defensive tone can hurt', 'Does not by itself change the decision'],
      typicalNextStep: 'Write a calm, factual response and keep a dated copy for yourself.',
      urgency: 'important',
    },
    {
      id: 'employment_notice-request-records',
      title: 'Request your personnel file and related records',
      summary:
        'Many places let employees ask for their personnel file, pay records, and the policies the notice relies on.',
      pros: [
        'Shows what the employer has documented',
        'Helps spot inconsistencies',
        'Usually free',
      ],
      cons: ['Employers may take weeks to respond', 'Rules on access vary'],
      typicalNextStep:
        'Send a short written request for your file and any policy the notice cites.',
      urgency: 'info',
    },
    {
      id: 'employment_notice-review-pay-and-benefits',
      title: 'Review pay, benefits, and severance terms',
      summary:
        'Termination notices often come with deadlines for final pay, benefits continuation, and any severance offer.',
      pros: [
        'Protects money and coverage you may be owed',
        'Severance offers can sometimes be negotiated',
      ],
      cons: [
        'Signing a severance agreement usually waives claims',
        'Deadlines to elect benefits can be short',
      ],
      typicalNextStep:
        'List every deadline in the notice and do not sign a release before getting advice.',
      urgency: 'important',
    },
    {
      id: 'employment_notice-consult-employment-lawyer',
      title: 'Consult an employment lawyer or labour agency',
      summary:
        'Employment lawyers and government labour agencies can assess whether the notice raises discrimination, retaliation, or wage issues.',
      pros: ['Many offer free first consultations', 'Agencies can investigate at no cost'],
      cons: ['Agency complaints have filing time limits', 'Legal fees if a case proceeds'],
      typicalNextStep: 'Write a timeline of events while they are fresh, then book a consultation.',
      urgency: 'important',
    },
  ],
};
