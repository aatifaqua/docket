import { describe, expect, it, vi } from 'vitest';
import type { Hono } from 'hono';
import { DISCLAIMER, MAX_INPUT_CHARS, SAMPLE_NOTICES, type Analysis } from '@docket/core';
import { createMockBriefingService, type BriefingService } from './ai/briefing.ts';
import { createApp } from './app.ts';
import type { Config } from './config.ts';
import { silentLogger, type Logger } from './log.ts';
import { AnalysisStore } from './store.ts';

const sample = SAMPLE_NOTICES[0]!;
const REFERENCE = '2026-09-21';
const UNKNOWN_ID = '123e4567-e89b-42d3-a456-426614174000';

interface ErrorBody {
  error: { code: string; message: string };
}

function build(
  overrides: Partial<Config> = {},
  deps: { briefingService?: BriefingService; logger?: Logger; now?: () => number } = {},
): { app: Hono } {
  const config: Config = {
    aiMode: 'mock',
    apiKey: undefined,
    port: 0,
    corsOrigins: ['http://localhost:5173'],
    rateLimitPerMinute: 1000,
    maxUploadBytes: 2_000_000,
    trustProxy: false,
    ...overrides,
  };
  const store = new AnalysisStore(deps.now === undefined ? {} : { now: deps.now });
  const app = createApp({
    config,
    briefingService: deps.briefingService ?? createMockBriefingService(),
    store,
    logger: deps.logger ?? silentLogger,
  });
  return { app };
}

async function postJson(app: Hono, path: string, body: unknown): Promise<Response> {
  return app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function analyzeSample(app: Hono): Promise<Analysis> {
  const res = await postJson(app, '/api/analyze', { text: sample.text, referenceDate: REFERENCE });
  expect(res.status).toBe(201);
  return (await res.json()) as Analysis;
}

describe('GET /api/health', () => {
  it('reports mode and model, with strict security headers', async () => {
    const { app } = build();
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      aiMode: 'mock',
      model: 'deterministic-fallback',
    });
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('names the Gemini model in live mode', async () => {
    const { app } = build({ aiMode: 'live', apiKey: 'k' });
    const res = await app.request('/api/health');
    await expect(res.json()).resolves.toMatchObject({
      aiMode: 'live',
      model: expect.stringMatching(/^gemini-/) as string,
    });
  });

  it('only echoes allow-listed origins for CORS', async () => {
    const { app } = build();
    const allowed = await app.request('/api/health', {
      headers: { origin: 'http://localhost:5173' },
    });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    const denied = await app.request('/api/health', { headers: { origin: 'https://evil.test' } });
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('returns JSON for unknown routes', async () => {
    const { app } = build();
    const res = await app.request('/nope');
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'NOT_FOUND' } });
  });
});

describe('POST /api/analyze', () => {
  it('analyses JSON text and returns a full Analysis with the disclaimer', async () => {
    const { app } = build();
    const analysis = await analyzeSample(app);
    expect(analysis.core.classification.kind).toBe(sample.kind);
    expect(analysis.core.referenceDate).toBe(REFERENCE);
    expect(analysis.source).toBe('fallback');
    expect(analysis.disclaimer).toBe(DISCLAIMER);
    expect(analysis.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(analysis.briefing.checklist.length).toBeGreaterThan(0);
  });

  it('serves an identical request from the cache with 200 and the same id', async () => {
    const mock = createMockBriefingService();
    const generate = vi.fn<BriefingService['generate']>((core, text) => mock.generate(core, text));
    const service: BriefingService = { ...mock, generate };
    const { app } = build({}, { briefingService: service });
    const first = await analyzeSample(app);
    const res = await postJson(app, '/api/analyze', {
      text: sample.text,
      referenceDate: REFERENCE,
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as Analysis).id).toBe(first.id);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('does not cache a fallback briefing in live mode so the model is retried', async () => {
    const mock = createMockBriefingService();
    const generate = vi.fn<BriefingService['generate']>((core, text) => mock.generate(core, text));
    const service: BriefingService = { ...mock, generate };
    const { app } = build({ aiMode: 'live', apiKey: 'test-key' }, { briefingService: service });
    const first = await analyzeSample(app);
    const second = await analyzeSample(app);
    expect(second.id).not.toBe(first.id);
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('re-analyses when the cached entry has expired from the store', async () => {
    let clock = 0;
    const { app } = build({}, { now: () => clock });
    const first = await analyzeSample(app);
    clock = 25 * 60 * 60 * 1000;
    const second = await analyzeSample(app);
    expect(second.id).not.toBe(first.id);
  });

  it('defaults the reference date to today (UTC) when omitted', async () => {
    const { app } = build();
    const res = await postJson(app, '/api/analyze', { text: sample.text });
    expect(res.status).toBe(201);
    const { core } = (await res.json()) as Analysis;
    expect(core.referenceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('rejects short text with a plain-language 400', async () => {
    const { app } = build();
    const res = await postJson(app, '/api/analyze', { text: 'too short to analyse' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe('TOO_SHORT');
    expect(body.error.message).toMatch(/at least 40 words/);
  });

  it('rejects a malformed reference date, a missing text field and invalid JSON', async () => {
    const { app } = build();
    const badDate = await postJson(app, '/api/analyze', {
      text: sample.text,
      referenceDate: '21/09/2026',
    });
    expect(badDate.status).toBe(400);
    expect(((await badDate.json()) as ErrorBody).error.message).toMatch(/yyyy-mm-dd/);

    const impossible = await postJson(app, '/api/analyze', {
      text: sample.text,
      referenceDate: '2026-13-45',
    });
    expect(impossible.status).toBe(400);
    expect(((await impossible.json()) as ErrorBody).error.code).toBe('INVALID_DATE');

    const noText = await postJson(app, '/api/analyze', { referenceDate: REFERENCE });
    expect(noText.status).toBe(400);
    expect(((await noText.json()) as ErrorBody).error.message).toMatch(/"text" field/);

    const notJson = await app.request('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    expect(notJson.status).toBe(400);
    expect(((await notJson.json()) as ErrorBody).error.message).toMatch(/must be JSON/);
  });

  it('accepts a multipart .txt upload with a reference date', async () => {
    const { app } = build();
    const form = new FormData();
    form.append('file', new File([sample.text], 'notice.txt', { type: 'text/plain' }));
    form.append('referenceDate', REFERENCE);
    const res = await app.request('/api/analyze', { method: 'POST', body: form });
    expect(res.status).toBe(201);
    const analysis = (await res.json()) as Analysis;
    expect(analysis.core.classification.kind).toBe(sample.kind);
    expect(analysis.core.referenceDate).toBe(REFERENCE);
  });

  it('rejects binary uploads with 415 and a missing file with 400', async () => {
    const { app } = build();
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const form = new FormData();
    form.append('file', new File([png], 'notice.png', { type: 'image/png' }));
    const res = await app.request('/api/analyze', { method: 'POST', body: form });
    expect(res.status).toBe(415);
    expect(((await res.json()) as ErrorBody).error.code).toBe('UNSUPPORTED_MEDIA_TYPE');

    const empty = new FormData();
    empty.append('referenceDate', REFERENCE);
    const missing = await app.request('/api/analyze', { method: 'POST', body: empty });
    expect(missing.status).toBe(400);
    expect(((await missing.json()) as ErrorBody).error.message).toMatch(/\.txt or \.pdf/);
  });

  it('returns 413 for text over the core limit and for bodies over the upload limit', async () => {
    const { app } = build({ maxUploadBytes: 4096 });
    const tooLong = await postJson(app, '/api/analyze', {
      text: 'word '.repeat(MAX_INPUT_CHARS / 5 + 10),
    });
    expect(tooLong.status).toBe(413);
    expect(((await tooLong.json()) as ErrorBody).error.code).toBe('PAYLOAD_TOO_LARGE');

    const overUploadLimit = await postJson(app, '/api/analyze', { text: 'word '.repeat(1200) });
    expect(overUploadLimit.status).toBe(413);
    expect(((await overUploadLimit.json()) as ErrorBody).error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('hides internal failures behind a generic 500 and logs them', async () => {
    const warn = vi.fn();
    const service: BriefingService = {
      ...createMockBriefingService(),
      generate: () => Promise.reject(new Error('secret stack details')),
    };
    const { app } = build({}, { briefingService: service, logger: { info: vi.fn(), warn } });
    const res = await postJson(app, '/api/analyze', {
      text: sample.text,
      referenceDate: REFERENCE,
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).not.toContain('secret');
    expect(JSON.stringify(body)).not.toContain('stack');
    expect(warn).toHaveBeenCalledWith(
      'unhandled_error',
      expect.objectContaining({ message: 'secret stack details' }),
    );
  });
});

describe('GET /api/analysis/:id and ask', () => {
  it('returns a stored analysis, 404 for an unknown id and 400 for a malformed id', async () => {
    const { app } = build();
    const created = await analyzeSample(app);
    const found = await app.request(`/api/analysis/${created.id}`);
    expect(found.status).toBe(200);
    expect(((await found.json()) as Analysis).id).toBe(created.id);

    const missing = await app.request(`/api/analysis/${UNKNOWN_ID}`);
    expect(missing.status).toBe(404);
    expect(((await missing.json()) as ErrorBody).error.message).toMatch(/not found/i);

    const malformed = await app.request('/api/analysis/not-a-uuid');
    expect(malformed.status).toBe(400);
  });

  it('answers a grounded question with the disclaimer attached', async () => {
    const { app } = build();
    const created = await analyzeSample(app);
    const res = await postJson(app, `/api/analysis/${created.id}/ask`, {
      question: 'How much rent do I owe?',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.source).toBe('fallback');
    expect(body.grounded).toBe(true);
    expect(body.disclaimer).toBe(DISCLAIMER);
    expect(Array.isArray(body.citations)).toBe(true);
  });

  it('rejects over-long, empty and malformed questions', async () => {
    const { app } = build();
    const created = await analyzeSample(app);
    const long = await postJson(app, `/api/analysis/${created.id}/ask`, {
      question: 'x'.repeat(600),
    });
    expect(long.status).toBe(400);
    expect(((await long.json()) as ErrorBody).error.message).toMatch(/under 500 characters/);

    const blank = await postJson(app, `/api/analysis/${created.id}/ask`, { question: '   ' });
    expect(blank.status).toBe(400);

    const garbage = await app.request(`/api/analysis/${created.id}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'nope',
    });
    expect(garbage.status).toBe(400);

    const unknown = await postJson(app, `/api/analysis/${UNKNOWN_ID}/ask`, { question: 'Hi?' });
    expect(unknown.status).toBe(404);
  });
});

describe('rate limiting', () => {
  it('returns 429 with Retry-After once the per-minute limit is exceeded', async () => {
    const { app } = build({ rateLimitPerMinute: 3 });
    for (let i = 0; i < 3; i += 1) expect((await app.request('/api/health')).status).toBe(200);
    const blocked = await app.request('/api/health');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toMatch(/^\d+$/);
    expect(blocked.headers.get('RateLimit-Limit')).toBe('3');
    const forged = await app.request('/api/health', {
      headers: { 'x-forwarded-for': '198.51.100.7' },
    });
    expect(forged.status).toBe(429);
  });
});
