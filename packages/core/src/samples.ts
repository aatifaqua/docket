import type { DocumentKind } from './types.ts';

export interface SampleNotice {
  id: string;
  title: string;
  kind: DocumentKind;
  /** ISO date the notice was received; the intake uses it as the reference date. */
  receivedOn: string;
  text: string;
}

/**
 * Three fictional notices used by the intake sample chips and the GitHub Pages demo. Names,
 * addresses, courts and companies are invented; each sample carries explicit dates, relative
 * windows, dollar amounts and "you must" sentences so every extractor has something to find.
 */
export const SAMPLE_NOTICES: readonly SampleNotice[] = [
  {
    id: 'sample-eviction',
    title: 'Eviction notice (pay or quit)',
    kind: 'eviction_notice',
    receivedOn: '2026-09-29',
    text: `NOTICE TO PAY RENT OR QUIT

To: Priya Halvorsen and all other occupants of 1170 Cedar Row Court, Unit 12, Millbrook.

This notice is dated September 28, 2026.

You are hereby notified that the rent for the premises described above is past due. The total rent now owed is $1,850.00 for the month of September 2026, plus a late fee of $75.00, for a total of $1,925.00.

Within five (5) days after service of this notice you must pay the full amount stated above to the landlord, Northgate Residential LP, at 400 Quarry Street, Floor 3, Millbrook, or you must vacate the premises and deliver possession to the landlord. Payment must be made by money order or cashier's check.

If you fail to pay the full amount or to vacate the premises on or before October 6, 2026, the landlord will begin an unlawful detainer action against you to recover possession of the premises, unpaid rent, court costs and any other relief the court allows. An eviction judgment may be reported to tenant screening services.

Partial payments will not be accepted unless the landlord agrees in writing. Nothing in this notice waives the landlord's right to enforce any other term of your lease.

Tenants may contact the Millbrook Tenant Help Line to ask about rental assistance. You must keep a copy of any payment receipt.

Northgate Residential LP, Property Manager`,
  },
  {
    id: 'sample-summons',
    title: 'Civil court summons',
    kind: 'court_summons',
    receivedOn: '2026-10-02',
    text: `IN THE DISTRICT COURT OF ALDER COUNTY, CIVIL DIVISION

Case Number: 26-CV-04471

Northbridge Auto Finance Inc., Plaintiff, v. Tomas Reyes-Whitfield, Defendant.

SUMMONS

To the defendant named above: You are hereby summoned and required to file an answer to the attached complaint with the Clerk of the Court and to serve a copy on the plaintiff's attorney within 30 days after service of this summons on you, not counting the day of service. The complaint seeks $4,850.00 in unpaid loan instalments, plus interest of $312.40 and court costs.

If you fail to file an answer within the time stated, a default judgment may be entered against you for the relief demanded in the complaint without further notice to you. A judgment may allow the plaintiff to garnish wages or place a lien on property.

A case management hearing has been scheduled for November 12, 2026 at 9:00 a.m. in Courtroom 4. You must appear at the hearing in person or through an attorney. If you cannot afford a lawyer, you may ask the court's self-help centre about legal aid and fee waivers.

This summons was served on you on October 2, 2026. Attorneys for the plaintiff: Kessler & Bram LLP, 15 Harbor Plaza, Millbrook.

Clerk of the Court, Alder County District Court`,
  },
  {
    id: 'sample-debt',
    title: 'Debt-collection validation letter',
    kind: 'debt_collection',
    receivedOn: '2026-10-02',
    text: `Harborline Recovery Services
PO Box 1000, Millbrook

September 30, 2026

Re: Account number ending 7731, original creditor Riverbank Card Services
Balance due: $2,317.45

Dear Dana Okafor,

This letter is a validation notice. Harborline Recovery Services is a debt collector. We are attempting to collect a debt that you owe to Riverbank Card Services, and any information obtained will be used for that purpose. As of the date of this letter, the balance due on the account is $2,317.45, which includes interest of $187.20 and fees of $45.00.

You have 30 days from the date you receive this letter to dispute the debt. If you notify us in writing within that period that you dispute the debt, or any part of it, we will obtain verification of the debt and mail a copy to you, and we will pause collection until we do so. If you ask in writing within the same period, we will send you the name and address of the original creditor if it differs from the current creditor. Unless you dispute the validity of the debt, or any portion of it, within 30 days, we will assume the debt is valid.

You must send any dispute to the address above. We may report this account to the credit reporting agencies after November 2, 2026. Please contact us to discuss payment options.

Harborline Recovery Services`,
  },
];
