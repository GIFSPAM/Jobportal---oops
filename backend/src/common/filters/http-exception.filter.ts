import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { MulterError } from 'multer';

/** Single place where every thrown error becomes a response body. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.toPayload(exception);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({ success: false, message });
  }

  private toPayload(exception: unknown): { status: number; message: string } {
    if (exception instanceof MulterError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message:
          exception.code === 'LIMIT_FILE_SIZE'
            ? 'File is too large.'
            : 'Invalid file type. Only PDFs allowed!',
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        return { status, message: body };
      }

      if (typeof body === 'object' && body !== null) {
        const record = body as Record<string, unknown>;
        return { status, message: this.toText(record.message, exception.message) };
      }

      return { status, message: exception.message };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error.',
    };
  }

  /** Produces the response `message`, which the contract guarantees to be a non-empty string. */
  private toText(...candidates: unknown[]): string {
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        const joined = candidate.filter(Boolean).join(', ');
        if (joined) return joined;
      } else if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }
    return 'Request failed.';
  }
}
