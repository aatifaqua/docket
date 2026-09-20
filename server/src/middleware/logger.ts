import type { MiddlewareHandler } from 'hono';
import type { Logger } from '../log.ts';

/**
 * Logs one line per request with its id, method, path, status and duration. Bodies are never
 * logged; the shared logger clips every string field anyway.
 */
export function requestLogger(logger: Logger): MiddlewareHandler {
  return async (c, next) => {
    const started = performance.now();
    await next();
    logger.info('request', {
      requestId: c.res.headers.get('x-request-id'),
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      ms: Math.round(performance.now() - started),
    });
  };
}
