import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { serve } from '@hono/node-server';
import { createGeminiBriefingService, createMockBriefingService } from './ai/briefing.ts';
import { createGeminiClient } from './ai/gemini.ts';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createLogger } from './log.ts';
import { AnalysisStore } from './store.ts';

/**
 * Loads KEY=VALUE lines from server/.env into process.env without overriding values already
 * set. Kept dependency-free on purpose; the file is git-ignored and its values are never logged.
 */
function loadDotEnv(path: string): void {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    process.env[key] ??= trimmed.slice(separator + 1).trim();
  }
}

loadDotEnv(resolve(import.meta.dirname, '../.env'));

const logger = createLogger();
const config = loadConfig();
const briefingService =
  config.aiMode === 'live' && config.apiKey !== undefined
    ? createGeminiBriefingService(
        createGeminiClient(config.apiKey, (model, message) => {
          logger.warn('gemini_model_failed', { model, message });
        }),
        logger,
      )
    : createMockBriefingService();

const app = createApp({ config, briefingService, store: new AnalysisStore(), logger });

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  logger.info(`docket api listening on :${String(info.port)} (aiMode=${config.aiMode})`);
});

const shutdown = (): void => {
  logger.info('shutting down');
  server.close(() => {
    process.exit(0);
  });
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
