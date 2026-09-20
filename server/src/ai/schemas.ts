import { Type, type Schema } from '@google/genai';
import { z } from 'zod';
import type { Answer, Briefing } from '@docket/core';

/**
 * Zod schemas mirror the core types with length caps so a runaway model response can never
 * become an unbounded payload, and the matching response schemas tell Gemini the exact shape.
 */
const MAX_STRING = 600;
const MAX_LONG_STRING = 1000;
const MAX_ITEMS = 12;

const text = z.string().max(MAX_STRING);
const longText = z.string().max(MAX_LONG_STRING);
const list = z.array(text).max(MAX_ITEMS);

export const briefingSchema = z.object({
  whatThisIs: text,
  plainSummary: longText,
  keyPoints: list.min(1),
  optionNotes: z.array(z.object({ optionId: text, whatItMeansForYou: text })).max(MAX_ITEMS),
  checklist: z
    .array(
      z.object({
        id: text,
        text,
        relatedDeadlineId: text.nullish().transform((value) => value ?? null),
      }),
    )
    .max(MAX_ITEMS),
  prepSheet: z.object({
    questionsForProfessional: list,
    documentsToGather: list,
    factsToWriteDown: list,
  }),
  termsExplained: z.array(z.object({ term: text, meaning: text })).max(MAX_ITEMS),
});

export const answerSchema = z.object({
  answer: longText,
  grounded: z.boolean(),
  citations: list,
});

export type ModelAnswer = Omit<Answer, 'source'>;

/** Parses untrusted JSON from the model into a Briefing, throwing on any shape violation. */
export function parseBriefing(value: unknown): Briefing {
  return briefingSchema.parse(value);
}

/** Parses untrusted JSON from the model into an Answer without its source tag. */
export function parseAnswer(value: unknown): ModelAnswer {
  return answerSchema.parse(value);
}

const str: Schema = { type: Type.STRING };
const strList: Schema = { type: Type.ARRAY, items: str };

function object(properties: Record<string, Schema>): Schema {
  const keys = Object.keys(properties);
  return { type: Type.OBJECT, properties, required: keys, propertyOrdering: keys };
}

export const BRIEFING_RESPONSE_SCHEMA: Schema = object({
  whatThisIs: str,
  plainSummary: str,
  keyPoints: strList,
  optionNotes: { type: Type.ARRAY, items: object({ optionId: str, whatItMeansForYou: str }) },
  checklist: {
    type: Type.ARRAY,
    items: object({ id: str, text: str, relatedDeadlineId: { type: Type.STRING, nullable: true } }),
  },
  prepSheet: object({
    questionsForProfessional: strList,
    documentsToGather: strList,
    factsToWriteDown: strList,
  }),
  termsExplained: { type: Type.ARRAY, items: object({ term: str, meaning: str }) },
});

export const ANSWER_RESPONSE_SCHEMA: Schema = object({
  answer: str,
  grounded: { type: Type.BOOLEAN },
  citations: strList,
});
