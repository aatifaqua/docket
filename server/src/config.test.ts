import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.ts';

describe('loadConfig', () => {
  it('applies defaults in mock mode without a key', () => {
    const config = loadConfig({ DOCKET_AI_MODE: 'mock' });
    expect(config).toEqual({
      aiMode: 'mock',
      apiKey: undefined,
      port: 8787,
      corsOrigins: ['http://localhost:5173'],
      rateLimitPerMinute: 60,
      maxUploadBytes: 2_000_000,
    });
  });

  it('defaults to live mode and requires a key there', () => {
    expect(() => loadConfig({})).toThrow(/GEMINI_API_KEY is required when DOCKET_AI_MODE=live/);
    expect(() => loadConfig({ GEMINI_API_KEY: '   ' })).toThrow(/GEMINI_API_KEY is required/);
  });

  it('accepts live mode with a key and coerces numbers and lists', () => {
    const config = loadConfig({
      GEMINI_API_KEY: ' test-key ',
      PORT: '9000',
      CORS_ORIGINS: 'http://a.test, https://b.test ,',
      RATE_LIMIT_PER_MINUTE: '5',
      MAX_UPLOAD_BYTES: '4096',
    });
    expect(config.aiMode).toBe('live');
    expect(config.apiKey).toBe('test-key');
    expect(config.port).toBe(9000);
    expect(config.corsOrigins).toEqual(['http://a.test', 'https://b.test']);
    expect(config.rateLimitPerMinute).toBe(5);
    expect(config.maxUploadBytes).toBe(4096);
  });

  it('rejects malformed values with a configuration error naming the field', () => {
    expect(() => loadConfig({ DOCKET_AI_MODE: 'mock', PORT: 'abc' })).toThrow(
      /Configuration error: PORT/,
    );
    expect(() => loadConfig({ DOCKET_AI_MODE: 'loud' })).toThrow(/DOCKET_AI_MODE/);
  });
});
