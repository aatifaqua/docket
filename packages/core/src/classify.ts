import type { Classification } from './types.ts';
import { SIGNALS, type KnownKind } from './classify.data.ts';

const MAX_SIGNALS = 8;
const MIN_CONFIDENCE = 0.34;
const MAX_CONFIDENCE = 0.99;

interface Matcher {
  phrase: string;
  weight: number;
  pattern: RegExp;
}

interface KindScore {
  kind: KnownKind | 'unknown';
  score: number;
  signals: string[];
}

const NO_SCORE: KindScore = { kind: 'unknown', score: 0, signals: [] };

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Patterns are compiled once at load so classification is a handful of regex tests. */
const MATCHERS: readonly (readonly [KnownKind, readonly Matcher[]])[] = (
  Object.keys(SIGNALS) as KnownKind[]
).map((kind) => [
  kind,
  SIGNALS[kind].map(({ phrase, weight }) => ({
    phrase,
    weight,
    pattern: new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'i'),
  })),
]);

function scoreKind(kind: KnownKind, matchers: readonly Matcher[], text: string): KindScore {
  const hits = matchers.filter((matcher) => matcher.pattern.test(text));
  return {
    kind,
    score: hits.reduce((total, hit) => total + hit.weight, 0),
    signals: hits.map((hit) => hit.phrase).slice(0, MAX_SIGNALS),
  };
}

/**
 * Classifies a document by weighted phrase signals. Confidence is the top score's share of
 * the top two scores, clamped to [0.34, 0.99], so a lone weak match never reads as certain
 * and the matched phrases are returned for transparency.
 */
export function classifyDocument(text: string): Classification {
  let top = NO_SCORE;
  let second = NO_SCORE;
  for (const [kind, matchers] of MATCHERS) {
    const candidate = scoreKind(kind, matchers, text);
    if (candidate.score > top.score) {
      second = top;
      top = candidate;
    } else if (candidate.score > second.score) {
      second = candidate;
    }
  }
  if (top.score === 0) return { kind: 'unknown', confidence: 0, signals: [] };
  const share = top.score / (top.score + second.score);
  const confidence = Math.min(MAX_CONFIDENCE, Math.max(MIN_CONFIDENCE, share));
  return { kind: top.kind, confidence: Math.round(confidence * 100) / 100, signals: top.signals };
}
