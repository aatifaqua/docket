import {
  analyzeDocument,
  buildFallbackAnswer,
  buildFallbackBriefing,
  CoreError,
  DISCLAIMER,
  SAMPLE_NOTICES,
} from '@docket/core';
import type { Analysis, Answer, Briefing, CoreAnalysis } from '@docket/core';
import demoBriefings from './demo-briefings.json';

const REQUEST_TIMEOUT_MS = 25_000;

/** Plain-language messages for the HTTP statuses the server documents. */
const HTTP_MESSAGES: Readonly<Record<number, string>> = {
  400: 'The server could not read that request. Check the text and the reference date, then try again.',
  404: 'That analysis has expired or does not exist. Please analyse the document again.',
  413: 'That document is too large. The limit is 2 MB.',
  415: 'Only plain-text (.txt) and PDF files can be uploaded.',
  429: 'Too many requests right now. Please wait a minute and try again.',
  500: 'Something went wrong on our side. Please try again in a moment.',
};
const GENERIC_MESSAGE =
  'We could not reach the analysis service. Check your connection and try again.';
const TIMEOUT_MESSAGE = 'The analysis took too long. Please try again.';
const PDF_DEMO_MESSAGE =
  'PDF files need the full server. In this demo, paste the text or choose a .txt file.';

/** Error with a message that is safe and clear enough to show directly to the user. */
export class ApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface AnalyzeInput {
  text: string;
  referenceDate: string;
  /** Id of the sample notice the text was filled from, when applicable. */
  sampleId?: string | null;
}

export interface AskInput {
  analysisId: string;
  question: string;
  core: CoreAnalysis;
  text: string;
}

const PREGENERATED: Readonly<Record<string, Briefing | undefined>> = demoBriefings;

function apiBase(): string {
  return import.meta.env.VITE_API_BASE ?? '';
}

/**
 * True when no API base is configured (GitHub Pages). The whole deterministic core then runs
 * in the browser, so the demo works with no backend and no document ever leaves the device.
 */
export function isDemoMode(): boolean {
  return apiBase() === '';
}

/** Small non-cryptographic hash so demo analyses get a stable id for checklist persistence. */
function hashText(input: string): string {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }
  return (hash >>> 0).toString(16);
}

function demoBriefingFor(text: string, sampleId: string | null | undefined, core: CoreAnalysis) {
  const sample = SAMPLE_NOTICES.find((entry) => entry.id === sampleId);
  const pregenerated = sample?.text === text ? PREGENERATED[sample.id] : null;
  return pregenerated ?? buildFallbackBriefing(core);
}

function analyzeInBrowser({ text, referenceDate, sampleId }: AnalyzeInput): Analysis {
  let core: CoreAnalysis;
  try {
    core = analyzeDocument(text, referenceDate);
  } catch (error) {
    if (error instanceof CoreError) throw new ApiError(error.message);
    throw error;
  }
  return {
    id: `demo-${hashText(`${text}\n${referenceDate}`)}`,
    createdAt: new Date().toISOString(),
    core,
    briefing: demoBriefingFor(text, sampleId, core),
    source: 'fallback',
    disclaimer: DISCLAIMER,
  };
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    throw new ApiError(timedOut ? TIMEOUT_MESSAGE : GENERIC_MESSAGE);
  }
  if (!response.ok) {
    throw new ApiError(HTTP_MESSAGES[response.status] ?? GENERIC_MESSAGE, response.status);
  }
  return (await response.json()) as T;
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Analyses pasted text: in the browser in demo mode, otherwise via `POST /api/analyze`. */
export async function analyze(input: AnalyzeInput): Promise<Analysis> {
  if (isDemoMode()) return analyzeInBrowser(input);
  return await postJson<Analysis>('/api/analyze', {
    text: input.text,
    referenceDate: input.referenceDate,
  });
}

/** Uploads a .txt or .pdf file as multipart form data; only the server can read PDFs. */
export function analyzeFile(file: File, referenceDate: string): Promise<Analysis> {
  if (isDemoMode()) return Promise.reject(new ApiError(PDF_DEMO_MESSAGE));
  const body = new FormData();
  body.append('file', file, file.name);
  body.append('referenceDate', referenceDate);
  return request<Analysis>('/api/analyze', { method: 'POST', body });
}

/**
 * Asks a follow-up question. Demo mode answers by quoting matching sentences from the text
 * (never inventing facts); server mode uses the grounded `ask` endpoint.
 */
export function ask({ analysisId, question, core, text }: AskInput): Promise<Answer> {
  if (isDemoMode()) return Promise.resolve(buildFallbackAnswer(question, core, text));
  return postJson<Answer>(`/api/analysis/${encodeURIComponent(analysisId)}/ask`, { question });
}

/** Reads a plain-text file in the browser so demo mode can accept .txt uploads offline. */
export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      reject(new ApiError('We could not read that file. Try pasting the text instead.'));
    };
    reader.readAsText(file);
  });
}

/** True for files the browser can read itself (by extension or declared type). */
export function isTextFile(file: File): boolean {
  return file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
}

/** Extracts a user-safe message from anything thrown during analysis. */
export function messageOf(error: unknown): string {
  return error instanceof Error && error.message !== '' ? error.message : GENERIC_MESSAGE;
}
