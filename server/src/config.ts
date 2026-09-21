import { z } from 'zod';

/** Environment schema. Values arrive as strings, so numbers are coerced and lists split. */
const envSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  DOCKET_AI_MODE: z.enum(['live', 'mock']).default('live'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8787),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(60),
  MAX_UPLOAD_BYTES: z.coerce.number().int().min(1024).default(2_000_000),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
});

export type AiMode = 'live' | 'mock';

export interface Config {
  aiMode: AiMode;
  /** Present only in live mode; never logged. */
  apiKey: string | undefined;
  port: number;
  corsOrigins: string[];
  rateLimitPerMinute: number;
  maxUploadBytes: number;
  /** Only true behind a reverse proxy that overwrites X-Forwarded-For; otherwise the socket address is used. */
  trustProxy: boolean;
}

function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue === undefined ? 'invalid environment' : `${issue.path.join('.')}: ${issue.message}`;
}

/**
 * Parses and validates configuration from an environment map. Pure so tests can pass their
 * own map. Live mode without a key fails fast with an actionable message instead of failing
 * on the first request.
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) throw new Error(`Configuration error: ${firstIssue(parsed.error)}`);
  const values = parsed.data;
  const key = values.GEMINI_API_KEY?.trim();
  const apiKey = key === undefined || key === '' ? undefined : key;
  if (values.DOCKET_AI_MODE === 'live' && apiKey === undefined) {
    throw new Error(
      'Configuration error: GEMINI_API_KEY is required when DOCKET_AI_MODE=live. ' +
        'Add it to server/.env or run with DOCKET_AI_MODE=mock.',
    );
  }
  return {
    aiMode: values.DOCKET_AI_MODE,
    apiKey,
    port: values.PORT,
    corsOrigins: values.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    rateLimitPerMinute: values.RATE_LIMIT_PER_MINUTE,
    maxUploadBytes: values.MAX_UPLOAD_BYTES,
    trustProxy: values.TRUST_PROXY === 'true',
  };
}
