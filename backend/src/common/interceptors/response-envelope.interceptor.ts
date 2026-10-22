import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResult, type Envelope } from '../interfaces/api-response.interface';

/** Wraps every successful controller return value in the standard envelope. */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<Envelope> {
    return next.handle().pipe(map((value) => this.envelop(value)));
  }

  private envelop(value: unknown): Envelope {
    if (value === undefined || value === null) {
      return { success: true };
    }

    if (value instanceof ApiResult) {
      const { data, options } = value;
      const payload: { success: true; message?: string; data?: unknown; count?: number } = {
        success: true,
      };

      if (options.message !== undefined) payload.message = options.message;
      if (data !== undefined) payload.data = data;
      if (options.count !== undefined) payload.count = options.count;

      return payload;
    }

    return { success: true, data: value };
  }
}
