/** Transport-level response contracts. */
export interface Envelope<T = unknown> {
  readonly success: true;
  readonly message?: string;
  readonly data?: T;
  readonly count?: number;
}

export interface EnvelopeOptions {
  message?: string;
  count?: number;
}

/** Marker wrapper returned by controllers. */
export class ApiResult<T = unknown> {
  private constructor(
    readonly data: T | undefined,
    readonly options: EnvelopeOptions,
  ) {}

  static withData<T>(data: T, options: EnvelopeOptions = {}): ApiResult<T> {
    return new ApiResult(data, options);
  }

  static withMessage(message: string): ApiResult<never> {
    return new ApiResult<never>(undefined, { message });
  }

  static withCount<T>(
    data: T,
    count: number,
    options: EnvelopeOptions = {},
  ): ApiResult<T> {
    return new ApiResult<T>(data, { ...options, count });
  }
}
