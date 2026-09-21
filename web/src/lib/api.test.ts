import { afterEach, describe, expect, it, vi } from 'vitest';
import { DISCLAIMER, MIN_INPUT_WORDS } from '@docket/core';
import type { Analysis, Answer } from '@docket/core';
import {
  analyze,
  analyzeFile,
  ApiError,
  ask,
  isDemoMode,
  isTextFile,
  messageOf,
  readTextFile,
} from './api.ts';
import demoBriefings from './demo-briefings.json';
import { fixtureAnalysis, REFERENCE_DATE, sampleNotice } from '../test-fixtures.ts';

const API = 'http://api.test';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function useServerMode(): ReturnType<typeof vi.fn> {
  vi.stubEnv('VITE_API_BASE', API);
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('demo mode', () => {
  it('is the default when no API base is configured', () => {
    expect(isDemoMode()).toBe(true);
  });

  it('analyses pasted text in the browser with the fallback briefing and a stable demo id', async () => {
    const text = sampleNotice(0).text.replace('Priya Halvorsen', 'Sam Nobody');
    const first = await analyze({ text, referenceDate: REFERENCE_DATE });
    const second = await analyze({ text, referenceDate: REFERENCE_DATE });
    expect(first.id).toMatch(/^demo-[0-9a-f]+$/);
    expect(second.id).toBe(first.id);
    expect(first.core.classification.kind).toBe('eviction_notice');
    expect(first.briefing.whatThisIs).toContain('This looks like an eviction notice');
    expect(first.source).toBe('fallback');
    expect(first.disclaimer).toBe(DISCLAIMER);
  });

  it('pairs an unchanged sample with its pre-generated briefing', async () => {
    const sample = sampleNotice(1);
    const analysis = await analyze({
      text: sample.text,
      referenceDate: REFERENCE_DATE,
      sampleId: sample.id,
    });
    expect(analysis.briefing).toEqual(demoBriefings['sample-summons']);
    expect(analysis.source).toBe('gemini');
  });

  it('falls back to the deterministic briefing when the sample text was edited', async () => {
    const sample = sampleNotice(1);
    const analysis = await analyze({
      text: `${sample.text}\nExtra line added by the user.`,
      referenceDate: REFERENCE_DATE,
      sampleId: sample.id,
    });
    expect(analysis.briefing.whatThisIs).toContain('This looks like a court summons');
  });

  it('turns core validation errors into plain-language ApiErrors', async () => {
    await expect(analyze({ text: 'too short', referenceDate: REFERENCE_DATE })).rejects.toThrow(
      new RegExp(`at least ${String(MIN_INPUT_WORDS)} words`),
    );
    await expect(
      analyze({ text: sampleNotice(0).text, referenceDate: 'yesterday' }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('answers questions offline by quoting the document', async () => {
    const analysis = fixtureAnalysis(0);
    const answer = await ask({
      analysisId: analysis.id,
      question: 'How much rent is owed?',
      core: analysis.core,
      text: sampleNotice(0).text,
    });
    expect(answer.source).toBe('fallback');
    expect(answer.grounded).toBe(true);
    expect(answer.citations.length).toBeGreaterThan(0);
  });

  it('refuses file uploads because PDFs need the server', async () => {
    const file = new File(['%PDF-1.4'], 'notice.pdf', { type: 'application/pdf' });
    await expect(analyzeFile(file, REFERENCE_DATE)).rejects.toThrow(
      /PDF files need the full server/,
    );
  });
});

describe('server mode', () => {
  it('posts JSON to /api/analyze and returns the parsed analysis', async () => {
    const fetchMock = useServerMode();
    const expected: Analysis = fixtureAnalysis(0);
    fetchMock.mockResolvedValue(jsonResponse(expected, 201));

    const result = await analyze({ text: 'some text', referenceDate: REFERENCE_DATE });

    expect(isDemoMode()).toBe(false);
    expect(result).toEqual(expected);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API}/api/analyze`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      text: 'some text',
      referenceDate: REFERENCE_DATE,
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('maps 429 and other documented statuses to plain-language messages', async () => {
    const fetchMock = useServerMode();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'rate limited' }, 429));
    const failure = await analyze({ text: 'x', referenceDate: REFERENCE_DATE }).catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(429);
    expect((failure as ApiError).message).toMatch(/wait a minute/);

    fetchMock.mockResolvedValueOnce(jsonResponse({}, 413));
    await expect(analyze({ text: 'x', referenceDate: REFERENCE_DATE })).rejects.toThrow(
      /too large/,
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 418));
    await expect(analyze({ text: 'x', referenceDate: REFERENCE_DATE })).rejects.toThrow(
      /could not reach/,
    );
  });

  it('shows the message from the server error envelope when it carries one', async () => {
    const fetchMock = useServerMode();
    const envelope = { error: { code: 'TOO_SHORT', message: 'Paste at least 40 words.' } };
    fetchMock.mockResolvedValueOnce(jsonResponse(envelope, 400));
    await expect(analyze({ text: 'x', referenceDate: REFERENCE_DATE })).rejects.toThrow(
      'Paste at least 40 words.',
    );

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code: 'X', message: '  ' } }, 400));
    await expect(analyze({ text: 'x', referenceDate: REFERENCE_DATE })).rejects.toThrow(
      /could not read that request/,
    );

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'plain string' }, 400));
    await expect(analyze({ text: 'x', referenceDate: REFERENCE_DATE })).rejects.toThrow(
      /could not read that request/,
    );

    fetchMock.mockResolvedValueOnce(new Response('<html>oops</html>', { status: 500 }));
    await expect(analyze({ text: 'x', referenceDate: REFERENCE_DATE })).rejects.toThrow(
      /went wrong on our side/,
    );
  });

  it('distinguishes a timeout from a network failure', async () => {
    const fetchMock = useServerMode();
    fetchMock.mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'));
    await expect(analyze({ text: 'x', referenceDate: REFERENCE_DATE })).rejects.toThrow(
      /took too long/,
    );
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(analyze({ text: 'x', referenceDate: REFERENCE_DATE })).rejects.toThrow(
      /could not reach/,
    );
  });

  it('uploads files as multipart form data', async () => {
    const fetchMock = useServerMode();
    fetchMock.mockResolvedValue(jsonResponse(fixtureAnalysis(0), 201));
    const file = new File(['%PDF-1.4'], 'notice.pdf', { type: 'application/pdf' });

    await analyzeFile(file, REFERENCE_DATE);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('referenceDate')).toBe(REFERENCE_DATE);
    expect((body.get('file') as File).name).toBe('notice.pdf');
  });

  it('asks the grounded endpoint for the analysis id', async () => {
    const fetchMock = useServerMode();
    const expected: Answer = { answer: 'Yes.', grounded: true, citations: ['x'], source: 'gemini' };
    fetchMock.mockResolvedValue(jsonResponse(expected));
    const analysis = fixtureAnalysis(0);

    const answer = await ask({
      analysisId: 'abc/def',
      question: 'Q?',
      core: analysis.core,
      text: '',
    });

    expect(answer).toEqual(expected);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API}/api/analysis/abc%2Fdef/ask`);
  });
});

describe('file helpers', () => {
  it('reads plain-text files in the browser', async () => {
    const file = new File(['hello notice'], 'notice.txt', { type: 'text/plain' });
    await expect(readTextFile(file)).resolves.toBe('hello notice');
  });

  it('rejects with a readable message when the browser cannot read the file', async () => {
    class FailingReader {
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      result: string | null = null;
      readAsText(): void {
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal('FileReader', FailingReader);
    await expect(readTextFile(new File(['x'], 'a.txt'))).rejects.toThrow(
      /could not read that file/,
    );
  });

  it('fails loudly when a fixture index does not exist', () => {
    expect(() => sampleNotice(99)).toThrow(/No sample notice/);
  });

  it('recognises text files by type or extension', () => {
    expect(isTextFile(new File([''], 'a.TXT'))).toBe(true);
    expect(isTextFile(new File([''], 'a.bin', { type: 'text/plain' }))).toBe(true);
    expect(isTextFile(new File([''], 'a.pdf', { type: 'application/pdf' }))).toBe(false);
  });

  it('extracts a safe message from unknown errors', () => {
    expect(messageOf(new ApiError('Nope'))).toBe('Nope');
    expect(messageOf('string')).toMatch(/could not reach/);
    expect(messageOf(new Error(''))).toMatch(/could not reach/);
  });
});
