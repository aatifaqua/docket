import { Hono } from 'hono';
import type { Config } from '../config.ts';
import { getPreferredModel } from '../ai/gemini.ts';

/** Liveness endpoint that also tells operators which mode and model are in use. */
export function healthRoutes(config: Config): Hono {
  const app = new Hono();
  app.get('/api/health', (c) =>
    c.json({
      ok: true,
      aiMode: config.aiMode,
      model: config.aiMode === 'live' ? getPreferredModel() : 'deterministic-fallback',
    }),
  );
  return app;
}
