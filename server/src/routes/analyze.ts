import { randomUUID } from 'node:crypto';
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { DISCLAIMER, analyzeDocument, sanitizeText, type Analysis } from '@docket/core';
import type { BriefingService } from '../ai/briefing.ts';
import { hashContent, type ContentCache } from '../cache.ts';
import { extractUploadText } from '../extract.ts';
import { ApiError } from '../middleware/errors.ts';
import type { AnalysisStore } from '../store.ts';

export interface AnalyzeDeps {
  briefingService: BriefingService;
  store: AnalysisStore;
  cache: ContentCache;
  maxUploadBytes: number;
  /**
   * Whether analyses whose briefing came from the deterministic fallback may be cached.
   * In live mode a fallback means the model was unavailable, so the next identical request
   * should try the model again instead of replaying the degraded result.
   */
  cacheFallbackBriefings: boolean;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const inputSchema = z.object({
  text: z.string({ error: 'Provide the document text in the "text" field.' }),
  referenceDate: z
    .string()
    .regex(ISO_DATE_RE, { error: 'The reference date must be written as yyyy-mm-dd.' })
    .optional(),
});

function badRequest(message: string): ApiError {
  return new ApiError(400, 'BAD_REQUEST', message);
}

async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw badRequest('The request body must be JSON with a "text" field.');
    }
    throw error;
  }
}

async function readMultipart(c: Context, maxUploadBytes: number): Promise<unknown> {
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) throw badRequest('Attach a .txt or .pdf file in the "file" field.');
  const text = await extractUploadText(new Uint8Array(await file.arrayBuffer()), maxUploadBytes);
  const referenceDate = body.referenceDate;
  return typeof referenceDate === 'string' && referenceDate !== ''
    ? { text, referenceDate }
    : { text };
}

interface AnalyzeInput {
  rawText: string;
  referenceDate: string;
}

async function readInput(c: Context, maxUploadBytes: number, today: string): Promise<AnalyzeInput> {
  const contentType = c.req.header('content-type') ?? '';
  const raw = contentType.startsWith('multipart/form-data')
    ? await readMultipart(c, maxUploadBytes)
    : await readJson(c);
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? 'The request could not be understood.');
  }
  return { rawText: parsed.data.text, referenceDate: parsed.data.referenceDate ?? today };
}

/**
 * POST /api/analyze. The deterministic core runs first and is the only source of facts; the
 * briefing service only explains them. Identical text and reference date reuse the stored
 * analysis, which avoids a second model call. The server clock is read exactly once per
 * request, for the default reference date and the created-at stamp.
 */
export function analyzeRoutes(deps: AnalyzeDeps): Hono {
  const app = new Hono();
  app.post('/api/analyze', async (c) => {
    const now = new Date();
    const { rawText, referenceDate } = await readInput(
      c,
      deps.maxUploadBytes,
      now.toISOString().slice(0, 10),
    );
    const text = sanitizeText(rawText);
    const hash = hashContent(text, referenceDate);
    const cachedId = deps.cache.get(hash);
    if (cachedId !== undefined) {
      const hit = deps.store.get(cachedId);
      if (hit !== undefined) return c.json(hit.analysis, 200);
      deps.cache.delete(hash);
    }
    const core = analyzeDocument(rawText, referenceDate);
    const generated = await deps.briefingService.generate(core, text);
    const analysis: Analysis = {
      id: randomUUID(),
      createdAt: now.toISOString(),
      core,
      briefing: generated.briefing,
      source: generated.source,
      disclaimer: DISCLAIMER,
    };
    deps.store.put(analysis, text);
    if (generated.source === 'gemini' || deps.cacheFallbackBriefings) {
      deps.cache.set(hash, analysis.id);
    }
    return c.json(analysis, 201);
  });
  return app;
}
