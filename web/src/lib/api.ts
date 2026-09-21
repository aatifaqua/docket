import type { Analysis, Answer, CoreAnalysis } from '@docket/core';

const REQUEST_TIMEOUT_MS = 60_000;

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

type DemoModule = typeof import('./demo.ts');
let demoModule: Promise<DemoModule> | null = null;

/** Loads the in-browser analysis code once; called early from the intake so the click feels instant. */
export function loadDemo(): Promise<DemoModule> {
  demoModule ??= import('./demo.ts');
  return demoModule;
}

/** Pulls the server's plain-language message out of its error envelope when it sent one. */
async function serverMessage(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null || !('error' in body)) return null;
    const detail = body.error;
    if (typeof detail !== 'object' || detail === null || !('message' in detail)) return null;
    return typeof detail.message === 'string' && detail.message.trim() !== ''
      ? detail.message
      : null;
  } catch {
    return null;
  }
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
    const message = (await serverMessage(response)) ?? HTTP_MESSAGES[response.status];
    throw new ApiError(message ?? GENERIC_MESSAGE, response.status);
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
  if (isDemoMode()) return (await loadDemo()).analyzeInBrowser(input);
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
 * Asks a follow-up question. Demo mode answers offline by quoting matching sentences from the
 * text; server mode uses the grounded `ask` endpoint.
 */
export async function ask(input: AskInput): Promise<Answer> {
  if (isDemoMode()) return (await loadDemo()).answerInBrowser(input);
  const path = `/api/analysis/${encodeURIComponent(input.analysisId)}/ask`;
  return await postJson<Answer>(path, { question: input.question });
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
