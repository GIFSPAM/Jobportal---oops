import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiErrorBody } from '../models/api';

/** Fallbacks used when the server sent no usable message. */
const NETWORK_ERROR_MESSAGE = 'Unable to reach the server. Please check your connection and try again.';
const UNKNOWN_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Pulls the human-readable message out of an API error body.
 *
 * The contract prefers `message`, then `error`, then the HTTP status text, so a
 * backend phrasing change never surfaces a raw technical error to the user.
 */
function friendlyMessage(error: HttpErrorResponse): string {
  const body = error.error as ApiErrorBody | string | null | undefined;

  if (typeof body === 'string' && body.trim().length > 0 && !body.startsWith('<')) {
    return body;
  }

  const fromBody =
    typeof body === 'object' && body !== null
      ? body.message || body.error
      : undefined;

  if (fromBody && fromBody.trim().length > 0) {
    return fromBody;
  }

  if (error.status === 0) {
    return NETWORK_ERROR_MESSAGE;
  }

  return error.statusText?.trim() || UNKNOWN_ERROR_MESSAGE;
}

/**
 * Turns every `HttpErrorResponse` into a plain `Error` with a friendly message,
 * so subscribers can treat failures uniformly (`err.message`) without knowing
 * anything about HTTP.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) =>
      throwError(() =>
        error instanceof HttpErrorResponse ? new Error(friendlyMessage(error)) : error,
      ),
    ),
  );
