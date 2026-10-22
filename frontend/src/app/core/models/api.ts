/** Untyped JSON payload for endpoints whose schema is not modelled yet. */
export type JsonRecord = Record<string, unknown>;

/**
 * Envelope every API response is wrapped in.
 *
 * `T` describes `data`, so callers get a typed payload straight out of the
 * HTTP helpers without re-asserting at each call site.
 */
export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
}

/** Envelope for list endpoints where `data` is always an array. */
export type ApiListEnvelope<T> = ApiEnvelope<T[]> & { count?: number };

/** Body of a failed request — the error interceptor reads `message` from here. */
export interface ApiErrorBody {
  success?: boolean;
  message?: string;
  error?: string;
}
