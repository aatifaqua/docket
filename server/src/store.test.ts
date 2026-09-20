import { describe, expect, it } from 'vitest';
import type { Analysis } from '@docket/core';
import { ContentCache, hashContent } from './cache.ts';
import { AnalysisStore, BoundedTtlMap } from './store.ts';

function fakeAnalysis(id: string): Analysis {
  return { id } as unknown as Analysis;
}

describe('BoundedTtlMap', () => {
  it('expires entries after the ttl using the injected clock', () => {
    let clock = 1000;
    const map = new BoundedTtlMap<string>({ ttlMs: 100, now: () => clock });
    map.set('a', 'A');
    expect(map.get('a')).toBe('A');
    clock += 100;
    expect(map.get('a')).toBeUndefined();
    expect(map.size).toBe(0);
  });

  it('evicts the oldest entry on overflow and sweeps expired ones on write', () => {
    let clock = 0;
    const map = new BoundedTtlMap<number>({ maxEntries: 2, ttlMs: 50, now: () => clock });
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);
    expect(map.get('a')).toBeUndefined();
    expect(map.get('b')).toBe(2);
    expect(map.get('c')).toBe(3);
    clock = 60;
    map.set('d', 4);
    expect(map.size).toBe(1);
    expect(map.get('d')).toBe(4);
  });

  it('re-setting a key refreshes its position and delete removes it', () => {
    const map = new BoundedTtlMap<number>({ maxEntries: 2 });
    map.set('a', 1);
    map.set('b', 2);
    map.set('a', 10);
    map.set('c', 3);
    expect(map.get('b')).toBeUndefined();
    expect(map.get('a')).toBe(10);
    map.delete('a');
    expect(map.get('a')).toBeUndefined();
  });
});

describe('AnalysisStore', () => {
  it('stores the analysis with its text and reports size', () => {
    const store = new AnalysisStore({ maxEntries: 1 });
    store.put(fakeAnalysis('one'), 'text one');
    expect(store.get('one')).toEqual({ analysis: { id: 'one' }, text: 'text one' });
    store.put(fakeAnalysis('two'), 'text two');
    expect(store.size).toBe(1);
    expect(store.get('one')).toBeUndefined();
  });

  it('drops entries once the ttl passes', () => {
    let clock = 0;
    const store = new AnalysisStore({ ttlMs: 10, now: () => clock });
    store.put(fakeAnalysis('x'), 'x');
    clock = 11;
    expect(store.get('x')).toBeUndefined();
  });
});

describe('ContentCache', () => {
  it('hashes text and reference date together', () => {
    const a = hashContent('same text', '2026-01-01');
    expect(a).toBe(hashContent('same text', '2026-01-01'));
    expect(a).not.toBe(hashContent('same text', '2026-01-02'));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('maps hashes to ids and forgets them on delete', () => {
    const cache = new ContentCache({ maxEntries: 5 });
    cache.set('h1', 'id-1');
    expect(cache.get('h1')).toBe('id-1');
    cache.delete('h1');
    expect(cache.get('h1')).toBeUndefined();
  });
});
