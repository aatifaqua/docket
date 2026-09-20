import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { requestId } from 'hono/request-id';
import type { BriefingService } from './ai/briefing.ts';
import { ContentCache } from './cache.ts';
import type { Config } from './config.ts';
import { createLogger, type Logger } from './log.ts';
import { createErrorHandler, notFoundHandler } from './middleware/errors.ts';
import { requestLogger } from './middleware/logger.ts';
import { rateLimit } from './middleware/rateLimit.ts';
import { corsAllowlist, securityHeaders } from './middleware/security.ts';
import { analysisRoutes } from './routes/analysis.ts';
import { analyzeRoutes } from './routes/analyze.ts';
import { healthRoutes } from './routes/health.ts';
import type { AnalysisStore } from './store.ts';

export interface AppDeps {
  config: Config;
  briefingService: BriefingService;
  store: AnalysisStore;
  cache?: ContentCache;
  logger?: Logger;
}

/**
 * Assembles middleware and routes without listening, so tests drive it with `app.request()`.
 * Order matters: headers and CORS apply to every response including errors, the rate limiter
 * runs before any body is read, and the body limit guards every handler that parses input.
 */
export function createApp(deps: AppDeps): Hono {
  const { config } = deps;
  const logger = deps.logger ?? createLogger();
  const cache = deps.cache ?? new ContentCache();
  const app = new Hono();

  app.use(securityHeaders());
  app.use(corsAllowlist(config.corsOrigins));
  app.use(requestId());
  app.use(requestLogger(logger));
  app.use(rateLimit({ limit: config.rateLimitPerMinute }));
  app.use(bodyLimit({ maxSize: config.maxUploadBytes }));

  app.route('/', healthRoutes(config));
  app.route(
    '/',
    analyzeRoutes({
      briefingService: deps.briefingService,
      store: deps.store,
      cache,
      cacheFallbackBriefings: deps.config.aiMode === 'mock',
      maxUploadBytes: config.maxUploadBytes,
    }),
  );
  app.route('/', analysisRoutes({ briefingService: deps.briefingService, store: deps.store }));

  app.notFound(notFoundHandler);
  app.onError(createErrorHandler(logger));
  return app;
}
