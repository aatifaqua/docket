import type { DocumentKind, OptionPath } from './types.ts';
import { NOTICE_OPTIONS } from './options.notices.ts';
import { CLAIM_OPTIONS } from './options.claims.ts';

const CATALOGUE: Readonly<Record<DocumentKind, readonly OptionPath[]>> = {
  ...NOTICE_OPTIONS,
  ...CLAIM_OPTIONS,
};

/**
 * Returns the static options catalogue for a document kind (three or four paths; three
 * generic ones for `unknown`). Options are authored and reviewed as code, never generated,
 * so the model can only explain them and cannot invent a path that does not exist.
 */
export function getOptions(kind: DocumentKind): OptionPath[] {
  return CATALOGUE[kind].map((option) => ({
    ...option,
    pros: [...option.pros],
    cons: [...option.cons],
  }));
}
