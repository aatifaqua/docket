import type { MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

/**
 * Strict headers for a JSON-only API. The CSP forbids loading anything and being framed,
 * which neutralises the impact of any response being rendered by a browser directly.
 */
export function securityHeaders(): MiddlewareHandler {
  return secureHeaders({
    contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    crossOriginResourcePolicy: 'same-site',
    referrerPolicy: 'no-referrer',
  });
}

/** CORS restricted to the configured allowlist; unknown origins get no CORS headers at all. */
export function corsAllowlist(origins: readonly string[]): MiddlewareHandler {
  const allowed = new Set(origins);
  return cors({
    origin: (origin) => (allowed.has(origin) ? origin : null),
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 600,
  });
}
