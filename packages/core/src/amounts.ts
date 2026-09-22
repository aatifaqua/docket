import type { MoneyAmount } from './types.ts';
import { clip, splitSentences } from './text.ts';

const MAX_AMOUNTS = 30;
const CONTEXT_MAX = 160;
const NUMBER = String.raw`\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+(?:\.\d{2})?`;
const MONEY_RE = new RegExp(String.raw`\$\s?(${NUMBER})|\b(${NUMBER})\s+(?:US\s+)?dollars\b`, 'gi');

/**
 * Extracts "$1,234.56" and "1,234 dollars" amounts with the sentence they appear in as
 * context. Amounts are parsed by code, never by the model, so the figures the user sees are
 * exactly the figures in the document.
 */
export function extractAmounts(text: string): MoneyAmount[] {
  return extractAmountsFromSentences(splitSentences(text));
}

/** Same extraction over pre-split sentences; stops scanning once the cap is reached. */
export function extractAmountsFromSentences(sentences: readonly string[]): MoneyAmount[] {
  const found: MoneyAmount[] = [];
  const seen = new Set<string>();
  for (const sentence of sentences) {
    if (found.length >= MAX_AMOUNTS) break;
    const context = clip(sentence, CONTEXT_MAX);
    for (const match of sentence.matchAll(MONEY_RE)) {
      const amount = Number(String(match[1] ?? match[2]).replace(/,/g, ''));
      const key = `${String(amount)}|${context}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ id: `amt-${String(found.length)}`, amount, currency: 'USD', context });
    }
  }
  return found.slice(0, MAX_AMOUNTS);
}
