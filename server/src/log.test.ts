import { describe, expect, it } from 'vitest';
import { clipForLog, createLogger, silentLogger } from './log.ts';

describe('logger', () => {
  it('clips long strings to 80 characters', () => {
    expect(clipForLog('short')).toBe('short');
    const clipped = clipForLog('x'.repeat(200));
    expect(clipped).toHaveLength(80);
    expect(clipped.endsWith('…')).toBe(true);
  });

  it('writes JSON lines with clipped string fields to the right sink', () => {
    const out: string[] = [];
    const err: string[] = [];
    const logger = createLogger({
      out: (line) => void out.push(line),
      err: (line) => void err.push(line),
    });
    logger.info('request', { path: '/x', ms: 3, text: 'y'.repeat(100) });
    logger.warn('problem');
    const info = JSON.parse(out[0] ?? '{}') as Record<string, unknown>;
    expect(info.level).toBe('info');
    expect(info.event).toBe('request');
    expect(info.ms).toBe(3);
    expect(String(info.text)).toHaveLength(80);
    expect(JSON.parse(err[0] ?? '{}')).toMatchObject({ level: 'warn', event: 'problem' });
  });

  it('silent logger does nothing', () => {
    expect(() => {
      silentLogger.info('a');
      silentLogger.warn('b');
    }).not.toThrow();
  });
});
