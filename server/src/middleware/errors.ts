import type { Context, ErrorHandler, NotFoundHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { HTTPException } from 'hono/http-exception';
import { CoreError } from '@docket/core';
import type { Logger } from '../log.ts';

/** Error the API can show to the user as-is: a status, a stable code, and plain language. */
export class ApiError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;

  constructor(status: ContentfulStatusCode, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const CORE_STATUS: Record<CoreError['code'], ContentfulStatusCode> = {
  TOO_SHORT: 400,
  TOO_LONG: 413,
  INVALID_DATE: 400,
};

const HTTP_CODES: Partial<Record<number, string>> = {
  400: 'BAD_REQUEST',
  404: 'NOT_FOUND',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  429: 'TOO_MANY_REQUESTS',
};

const GENERIC_MESSAGE = 'Something went wrong on our side. Please try again in a moment.';

function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof CoreError) return new ApiError(CORE_STATUS[err.code], err.code, err.message);
  if (err instanceof HTTPException) {
    return new ApiError(err.status, HTTP_CODES[err.status] ?? 'HTTP_ERROR', err.message);
  }
  return new ApiError(500, 'INTERNAL_ERROR', GENERIC_MESSAGE);
}

/** Serialises an error as `{ error: { code, message } }`. */
export function errorResponse(c: Context, error: ApiError): Response {
  return c.json({ error: { code: error.code, message: error.message } }, error.status);
}

/**
 * Global error handler. Known errors keep their plain-language message; anything else becomes
 * a generic 500 so stack traces and internal details never reach the client. The original
 * message is logged (clipped) for the operator.
 */
export function createErrorHandler(logger: Logger): ErrorHandler {
  return (err, c) => {
    const apiError = toApiError(err);
    if (apiError.status >= 500) {
      logger.warn('unhandled_error', {
        requestId: c.res.headers.get('x-request-id'),
        message: err.message,
      });
    }
    return errorResponse(c, apiError);
  };
}

/** JSON 404 so clients never receive an HTML page from the API. */
export const notFoundHandler: NotFoundHandler = (c) =>
  errorResponse(c, new ApiError(404, 'NOT_FOUND', 'That route does not exist.'));
