import { Hono } from 'hono';
import { z } from 'zod';
import { DISCLAIMER } from '@docket/core';
import type { BriefingService } from '../ai/briefing.ts';
import { ApiError } from '../middleware/errors.ts';
import type { AnalysisStore, StoredAnalysis } from '../store.ts';

export interface AnalysisDeps {
  briefingService: BriefingService;
  store: AnalysisStore;
}

const MAX_QUESTION_CHARS = 500;
const idSchema = z.uuid();
const askSchema = z.object({
  question: z
    .string({ error: 'Send your question in the "question" field.' })
    .trim()
    .min(1, { error: 'Please type a question.' })
    .max(MAX_QUESTION_CHARS, {
      error: `Please keep your question under ${String(MAX_QUESTION_CHARS)} characters.`,
    }),
});

function lookup(store: AnalysisStore, id: string): StoredAnalysis {
  if (!idSchema.safeParse(id).success) {
    throw new ApiError(400, 'BAD_REQUEST', 'That analysis id is not valid.');
  }
  const entry = store.get(id);
  if (entry === undefined) {
    throw new ApiError(
      404,
      'NOT_FOUND',
      'That analysis was not found. It may have expired; please analyse the document again.',
    );
  }
  return entry;
}

async function readQuestion(body: Promise<unknown>): Promise<string> {
  const raw = await body.catch(() => undefined);
  const parsed = askSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(400, 'BAD_REQUEST', parsed.error.issues[0]?.message ?? 'Invalid question.');
  }
  return parsed.data.question;
}

/**
 * GET /api/analysis/:id and POST /api/analysis/:id/ask. Follow-up answers are grounded in the
 * stored document text and analysis only; the response repeats the disclaimer because an
 * answer is user-facing content.
 */
export function analysisRoutes(deps: AnalysisDeps): Hono {
  const app = new Hono();
  app.get('/api/analysis/:id', (c) => c.json(lookup(deps.store, c.req.param('id')).analysis));
  app.post('/api/analysis/:id/ask', async (c) => {
    const entry = lookup(deps.store, c.req.param('id'));
    const question = await readQuestion(c.req.json());
    const answer = await deps.briefingService.answer(question, entry.analysis.core, entry.text);
    return c.json({ ...answer, disclaimer: DISCLAIMER });
  });
  return app;
}
