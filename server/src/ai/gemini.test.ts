import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Type, type GenerateContentParameters } from '@google/genai';
import {
  MODEL_CHAIN,
  createGeminiClient,
  createGeminiClientFrom,
  getPreferredModel,
  isRetryable,
  resetPreferredModel,
  type GenerateContentFn,
} from './gemini.ts';

const schema = { type: Type.OBJECT, properties: { a: { type: Type.NUMBER } } };
const parse = (raw: unknown): { a: number } => raw as { a: number };
const ok = (a: number): Promise<{ text: string }> =>
  Promise.resolve({ text: JSON.stringify({ a }) });
const fail = (message: string, status?: number): Promise<never> =>
  Promise.reject(Object.assign(new Error(message), status === undefined ? {} : { status }));

function modelsCalled(generate: ReturnType<typeof vi.fn<GenerateContentFn>>): string[] {
  return generate.mock.calls.map(([params]) => params.model);
}

describe('gemini client', () => {
  beforeEach(() => {
    resetPreferredModel();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('classifies transient capacity errors as retryable by HTTP status', () => {
    expect(isRetryable(Object.assign(new Error('Too Many Requests'), { status: 429 }))).toBe(true);
    expect(isRetryable(Object.assign(new Error('overloaded'), { status: 503 }))).toBe(true);
    expect(isRetryable(new Error('{"error":{"code":503,"message":"busy"}}'))).toBe(true);
    expect(isRetryable(Object.assign(new Error('bad argument'), { status: 400 }))).toBe(false);
    expect(isRetryable(new Error('This operation was aborted'))).toBe(false);
    expect(isRetryable('plain string')).toBe(false);
  });

  it('sends the structured-output call shape and returns the parsed value with the model', async () => {
    const generate = vi.fn<GenerateContentFn>(() => ok(7));
    const client = createGeminiClientFrom(generate);
    const result = await client.generateJson(schema, 'SYS', 'USER', parse);
    expect(result).toEqual({ value: { a: 7 }, model: 'gemini-3.8-flash' });
    const params: GenerateContentParameters | undefined = generate.mock.calls[0]?.[0];
    expect(params?.contents).toBe('USER');
    expect(params?.config).toMatchObject({
      systemInstruction: 'SYS',
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.2,
      maxOutputTokens: 4096,
    });
    expect(params?.config?.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('retries a retryable error once with backoff, then moves down the chain', async () => {
    const generate = vi
      .fn<GenerateContentFn>()
      .mockImplementationOnce(() => fail('rate limited', 429))
      .mockImplementationOnce(() => fail('unavailable', 503))
      .mockImplementationOnce(() => ok(1));
    const client = createGeminiClientFrom(generate);
    const pending = client.generateJson(schema, 's', 'u', parse);
    await vi.advanceTimersByTimeAsync(799);
    expect(generate).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    // The second attempt is the last one for that model, so the chain moves on without sleeping.
    expect(generate).toHaveBeenCalledTimes(3);
    const result = await pending;
    expect(result.model).toBe('gemini-3.6-flash');
    expect(modelsCalled(generate)).toEqual([
      'gemini-3.8-flash',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
    ]);
    expect(getPreferredModel()).toBe('gemini-3.6-flash');
  });

  it('skips retries for non-retryable errors and empty responses', async () => {
    const generate = vi
      .fn<GenerateContentFn>()
      .mockImplementationOnce(() => fail('400 bad request'))
      .mockImplementationOnce(() => Promise.resolve({ text: '   ' }))
      .mockImplementationOnce(() => ok(3));
    const client = createGeminiClientFrom(generate);
    const result = await client.generateJson(schema, 's', 'u', parse);
    expect(result).toEqual({ value: { a: 3 }, model: 'gemini-3.5-flash' });
    expect(modelsCalled(generate)).toEqual([...MODEL_CHAIN]);
  });

  it('throws after the whole chain fails and starts later calls at the last working model', async () => {
    const generate = vi.fn<GenerateContentFn>(() => fail('boom'));
    const onModelFailure = vi.fn<(model: string, message: string) => void>();
    const client = createGeminiClientFrom(generate, onModelFailure);
    await expect(client.generateJson(schema, 's', 'u', parse)).rejects.toThrow(
      /All Gemini models failed: boom/,
    );
    expect(generate).toHaveBeenCalledTimes(3);
    expect(onModelFailure.mock.calls.map(([model]) => model)).toEqual([...MODEL_CHAIN]);
    expect(onModelFailure).toHaveBeenLastCalledWith('gemini-3.5-flash', 'boom');

    generate.mockReset();
    generate.mockImplementationOnce(() => fail('nope')).mockImplementation(() => ok(9));
    await client.generateJson(schema, 's', 'u', parse);
    expect(getPreferredModel()).toBe('gemini-3.6-flash');
    generate.mockClear();
    await client.generateJson(schema, 's', 'u', parse);
    expect(modelsCalled(generate)).toEqual(['gemini-3.6-flash']);
  });

  it('surfaces parse failures as a move to the next model', async () => {
    const generate = vi
      .fn<GenerateContentFn>()
      .mockImplementationOnce(() => Promise.resolve({ text: 'not json' }))
      .mockImplementationOnce(() => ok(2));
    const client = createGeminiClientFrom(generate);
    const strictParse = (raw: unknown): { a: number } => {
      if (typeof raw !== 'object' || raw === null) throw new Error('bad');
      return raw as { a: number };
    };
    await expect(client.generateJson(schema, 's', 'u', strictParse)).resolves.toEqual({
      value: { a: 2 },
      model: 'gemini-3.6-flash',
    });
  });

  it('builds a production client without touching the network', () => {
    const client = createGeminiClient('not-a-real-key');
    expect(typeof client.generateJson).toBe('function');
  });
});
