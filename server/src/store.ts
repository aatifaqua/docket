import type { Analysis } from '@docket/core';

export interface BoundedMapOptions {
  maxEntries?: number;
  ttlMs?: number;
  /** Injectable clock so tests can drive expiry without waiting. */
  now?: () => number;
}

const DEFAULT_MAX_ENTRIES = 200;
/** One hour is enough for follow-up questions; shorter retention means less document text in memory. */
const DEFAULT_TTL_MS = 60 * 60 * 1000;

interface Entry<V> {
  value: V;
  expiresAt: number;
}

/**
 * Insertion-ordered map with a size cap and a TTL. Expired entries are dropped when they are
 * read, and swept in bulk only when the map is full, so a write is O(1) in the common case
 * and the full scan is amortised over `maxEntries` inserts. Overflow evicts the oldest.
 * Rationale: memory is the only storage, so both bounds are what keep the process healthy.
 */
export class BoundedTtlMap<V> {
  private readonly entries = new Map<string, Entry<V>>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor({
    maxEntries = DEFAULT_MAX_ENTRIES,
    ttlMs = DEFAULT_TTL_MS,
    now = () => Date.now(),
  }: BoundedMapOptions = {}) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.now = now;
  }

  get size(): number {
    return this.entries.size;
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    if (this.entries.size >= this.maxEntries) this.evictExpired();
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  private evictExpired(): void {
    const current = this.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= current) this.entries.delete(key);
    }
  }
}

export interface StoredAnalysis {
  analysis: Analysis;
  /** Sanitised document text, kept only so follow-up questions can be grounded in it. */
  text: string;
}

/** Bounded, expiring in-memory store for analyses and their source text. */
export class AnalysisStore {
  private readonly map: BoundedTtlMap<StoredAnalysis>;

  constructor(options: BoundedMapOptions = {}) {
    this.map = new BoundedTtlMap<StoredAnalysis>(options);
  }

  get size(): number {
    return this.map.size;
  }

  put(analysis: Analysis, text: string): void {
    this.map.set(analysis.id, { analysis, text });
  }

  get(id: string): StoredAnalysis | undefined {
    return this.map.get(id);
  }
}
