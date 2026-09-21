import { GoogleGenAI, type GenerateContentParameters, type Schema } from '@google/genai';

export const MODEL_CHAIN = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'] as const;

const MAX_ATTEMPTS_PER_MODEL = 2;
const BASE_BACKOFF_MS = 800;
const REQUEST_TIMEOUT_MS = 30_000;
/** Upper bound for the whole chain, so a busy provider cannot hold a request open for minutes. */
const CHAIN_DEADLINE_MS = 75_000;
const MAX_OUTPUT_TOKENS = 4096;
const TEMPERATURE = 0.2;
/** HTTP statuses that mean "try again shortly" rather than "this request is wrong". */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/** The single SDK call the client depends on, so tests can inject a fake without the network. */
export type GenerateContentFn = (
  params: GenerateContentParameters,
) => Promise<{ text: string | undefined }>;

export interface GeneratedJson<T> {
  value: T;
  model: string;
}

export interface GeminiClient {
  generateJson<T>(
    schema: Schema,
    systemPrompt: string,
    userPrompt: string,
    parse: (raw: unknown) => T,
  ): Promise<GeneratedJson<T>>;
}

let preferredModel: string = MODEL_CHAIN[0];

/** Model the next call will try first: the last one that answered successfully. */
export function getPreferredModel(): string {
  return preferredModel;
}

/** Resets the remembered model; used by tests. */
export function resetPreferredModel(): void {
  preferredModel = MODEL_CHAIN[0];
}

function orderedModels(): string[] {
  const start = Math.max(0, MODEL_CHAIN.indexOf(preferredModel as (typeof MODEL_CHAIN)[number]));
  return [...MODEL_CHAIN.slice(start), ...MODEL_CHAIN.slice(0, start)];
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Reads the HTTP status the SDK attaches to API errors, or one embedded in a JSON error body. */
function statusOf(err: unknown): number | undefined {
  if (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof err.status === 'number'
  ) {
    return err.status;
  }
  const match = /"code"\s*:\s*(\d{3})/.exec(errorMessage(err));
  return match?.[1] === undefined ? undefined : Number(match[1]);
}

/** True for rate-limit and capacity errors that usually clear within a second or two. */
export function isRetryable(err: unknown): boolean {
  const status = statusOf(err);
  return status !== undefined && RETRYABLE_STATUSES.has(status);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Request<T> {
  schema: Schema;
  systemPrompt: string;
  userPrompt: string;
  parse: (raw: unknown) => T;
}

async function callModel<T>(
  generate: GenerateContentFn,
  model: string,
  request: Request<T>,
): Promise<T> {
  const response = await generate({
    model,
    contents: request.userPrompt,
    config: {
      systemInstruction: request.systemPrompt,
      responseMimeType: 'application/json',
      responseSchema: request.schema,
      temperature: TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  });
  const text = response.text;
  if (text === undefined || text.trim() === '') throw new Error(`Empty response from ${model}`);
  return request.parse(JSON.parse(text));
}

type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown };

async function tryModel<T>(
  generate: GenerateContentFn,
  model: string,
  request: Request<T>,
): Promise<Outcome<T>> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt += 1) {
    try {
      return { ok: true, value: await callModel(generate, model, request) };
    } catch (error) {
      lastError = error;
      const lastAttempt = attempt === MAX_ATTEMPTS_PER_MODEL - 1;
      if (!isRetryable(error) || lastAttempt) break;
      await sleep(BASE_BACKOFF_MS * 2 ** attempt);
    }
  }
  return { ok: false, error: lastError };
}

/**
 * Builds a client over any generateContent-shaped function. Rationale: the model chain, retry
 * and timeout logic is fully testable with a fake, and the real SDK is wired in one line.
 * `onModelFailure` is called each time a model is abandoned so failover is visible in logs.
 */
export function createGeminiClientFrom(
  generate: GenerateContentFn,
  onModelFailure: (model: string, message: string) => void = () => undefined,
): GeminiClient {
  return {
    async generateJson(schema, systemPrompt, userPrompt, parse) {
      const request = { schema, systemPrompt, userPrompt, parse };
      let lastError: unknown = new Error('No models configured');
      const startedAt = Date.now();
      for (const model of orderedModels()) {
        if (Date.now() - startedAt > CHAIN_DEADLINE_MS) break;
        const outcome = await tryModel(generate, model, request);
        if (outcome.ok) {
          preferredModel = model;
          return { value: outcome.value, model };
        }
        lastError = outcome.error;
        onModelFailure(model, errorMessage(outcome.error));
      }
      throw new Error(`All Gemini models failed: ${errorMessage(lastError)}`);
    },
  };
}

/** Production client: structured JSON output from Gemini via the official SDK. */
export function createGeminiClient(
  apiKey: string,
  onModelFailure?: (model: string, message: string) => void,
): GeminiClient {
  const ai = new GoogleGenAI({ apiKey });
  return createGeminiClientFrom((params) => ai.models.generateContent(params), onModelFailure);
}
