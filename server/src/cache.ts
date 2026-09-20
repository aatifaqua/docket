import { createHash } from 'node:crypto';
import { BoundedTtlMap, type BoundedMapOptions } from './store.ts';

/**
 * Content hash of the sanitised text plus the reference date. Both go into the key because
 * the same document analysed against a different day yields different deadline maths.
 */
export function hashContent(text: string, referenceDate: string): string {
  return createHash('sha256').update(`${text}|${referenceDate}`).digest('hex');
}

/**
 * Maps a content hash to the id of an analysis already produced for it, so repeated
 * submissions of the same notice reuse the stored result instead of calling the model again.
 */
export class ContentCache {
  private readonly map: BoundedTtlMap<string>;

  constructor(options: BoundedMapOptions = {}) {
    this.map = new BoundedTtlMap<string>(options);
  }

  set(hash: string, analysisId: string): void {
    this.map.set(hash, analysisId);
  }

  get(hash: string): string | undefined {
    return this.map.get(hash);
  }

  delete(hash: string): void {
    this.map.delete(hash);
  }
}
