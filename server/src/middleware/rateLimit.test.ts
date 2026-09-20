import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { clientKey, rateLimit } from './rateLimit.ts';

describe('clientKey', () => {
  it('uses the first forwarded address or local', () => {
    expect(clientKey(undefined)).toBe('local');
    expect(clientKey('')).toBe('local');
    expect(clientKey(' 10.0.0.1 , 10.0.0.2')).toBe('10.0.0.1');
  });
});

describe('rateLimit', () => {
  function build(now: () => number): Hono {
    const app = new Hono();
    app.use(rateLimit({ limit: 2, windowMs: 1000, now }));
    app.get('/', (c) => c.text('ok'));
    return app;
  }

  it('limits per client within a window and resets after it', async () => {
    let clock = 0;
    const app = build(() => clock);
    const first = await app.request('/');
    expect(first.status).toBe(200);
    expect(first.headers.get('RateLimit-Limit')).toBe('2');
    expect(first.headers.get('RateLimit-Remaining')).toBe('1');
    await app.request('/');
    const blocked = await app.request('/');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBe('1');
    expect(blocked.headers.get('RateLimit-Remaining')).toBe('0');
    await expect(blocked.json()).resolves.toMatchObject({ error: { code: 'TOO_MANY_REQUESTS' } });

    const other = await app.request('/', { headers: { 'x-forwarded-for': '203.0.113.9' } });
    expect(other.status).toBe(200);

    clock = 1000;
    const afterReset = await app.request('/');
    expect(afterReset.status).toBe(200);
  });
});
