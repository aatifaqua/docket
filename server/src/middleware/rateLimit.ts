import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context, MiddlewareHandler } from 'hono';
import { ApiError, errorResponse } from './errors.ts';

export interface RateLimitOptions {
  limit: number;
  windowMs?: number;
  now?: () => number;
  /** Trust X-Forwarded-For. Off by default because any client can set that header. */
  trustProxy?: boolean;
}

interface Window {
  count: number;
  resetAt: number;
}

const DEFAULT_WINDOW_MS = 60_000;
/** Sweep expired windows once the map grows past this, keeping memory bounded under churn. */
const SWEEP_THRESHOLD = 5000;
/** Hard cap on tracked clients; beyond it the oldest window is dropped rather than growing without bound. */
const MAX_TRACKED = 20_000;

/** First address in X-Forwarded-For, or 'local' when the header is absent. */
export function clientKey(forwardedFor: string | undefined): string {
  const first = forwardedFor?.split(',')[0]?.trim();
  return first === undefined || first === '' ? 'local' : first;
}

/** Peer socket address; tests drive the app without a socket, so fall back to a shared key. */
function socketKey(c: Context): string {
  try {
    return getConnInfo(c).remote.address ?? 'local';
  } catch {
    return 'local';
  }
}

/**
 * Fixed-window in-memory rate limiter. Responses carry RateLimit-* headers so well-behaved
 * clients can pace themselves, and 429s include Retry-After.
 */
export function rateLimit({
  limit,
  windowMs = DEFAULT_WINDOW_MS,
  now = () => Date.now(),
  trustProxy = false,
}: RateLimitOptions): MiddlewareHandler {
  const windows = new Map<string, Window>();

  const sweep = (current: number): void => {
    if (windows.size < SWEEP_THRESHOLD) return;
    for (const [key, window] of windows) {
      if (window.resetAt <= current) windows.delete(key);
    }
  };

  const bump = (key: string, current: number): Window => {
    const existing = windows.get(key);
    if (existing !== undefined && existing.resetAt > current) {
      existing.count += 1;
      return existing;
    }
    sweep(current);
    if (windows.size >= MAX_TRACKED) {
      const oldest = windows.keys().next().value;
      if (oldest !== undefined) windows.delete(oldest);
    }
    const fresh = { count: 1, resetAt: current + windowMs };
    windows.set(key, fresh);
    return fresh;
  };

  return async (c, next) => {
    const current = now();
    const key = trustProxy ? clientKey(c.req.header('x-forwarded-for')) : socketKey(c);
    const window = bump(key, current);
    const secondsToReset = Math.max(1, Math.ceil((window.resetAt - current) / 1000));
    c.header('RateLimit-Limit', String(limit));
    c.header('RateLimit-Remaining', String(Math.max(0, limit - window.count)));
    c.header('RateLimit-Reset', String(secondsToReset));
    if (window.count > limit) {
      c.header('Retry-After', String(secondsToReset));
      const message = `Too many requests. Please wait ${String(secondsToReset)} seconds and try again.`;
      return errorResponse(c, new ApiError(429, 'TOO_MANY_REQUESTS', message));
    }
    await next();
    return undefined;
  };
}
