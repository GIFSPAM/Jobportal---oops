import type { ArgumentsHost } from '@nestjs/common';
import { HttpException, Logger } from '@nestjs/common';
import { MulterError } from 'multer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from './http-exception.filter';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../exceptions/domain.exceptions';

/** Runs the filter against a fake Express response and captures the result. */
function capture(exception: unknown): { status: number; body: Record<string, unknown> } {
  let status = 0;
  const json = vi.fn();
  const response = {
    status: vi.fn((code: number) => {
      status = code;
      return response;
    }),
    json,
  };
  const request = { method: 'GET', url: '/api/seeker/profile' };
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  } as unknown as ArgumentsHost;

  new HttpExceptionFilter().catch(exception, host);

  return { status, body: json.mock.calls[0]?.[0] as Record<string, unknown> };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HttpExceptionFilter', () => {
  const domainCases: Array<{ label: string; exception: HttpException; expected: number }> = [
    { label: 'bad request', exception: new BadRequestError('Invalid file type.'), expected: 400 },
    {
      label: 'unauthorized',
      exception: new UnauthorizedError('Access denied. No token provided.'),
      expected: 401,
    },
    {
      label: 'forbidden',
      exception: new ForbiddenError('Access denied. Insufficient role for this resource.'),
      expected: 403,
    },
    { label: 'not found', exception: new NotFoundError('Job not found.'), expected: 404 },
  ];

  it.each(domainCases)('maps a $label domain exception to $expected', ({ exception, expected }) => {
    const { status, body } = capture(exception);
    expect(status).toBe(expected);
    expect(body).toEqual({ success: false, message: exception.message });
  });

  it('flattens the class-validator array of violations into one readable message', () => {
    const exception = new HttpException(
      { statusCode: 400, message: ['email must be an email', 'password must be longer'] },
      400,
    );
    const { status, body } = capture(exception);
    expect(status).toBe(400);
    expect(body.message).toBe('email must be an email, password must be longer');
  });

  it('falls back when a body carries a nested object as its message', () => {
    const exception = new HttpException(
      { statusCode: 400, message: { field: 'email', reason: 'invalid' } },
      400,
    );
    const { status, body } = capture(exception);

    expect(status).toBe(400);
    expect(typeof body.message).toBe('string');
    expect(String(body.message).length).toBeGreaterThan(0);
    expect(body.message).not.toContain('[object Object]');
  });

  it('falls back when the message resolves to nothing usable', () => {
    const exception = new HttpException({ statusCode: 400, message: '' }, 400);
    const { body } = capture(exception);

    expect(body.message).toBe('Request failed.');
  });

  it('translates a multer size failure into a friendly 400', () => {
    const { status, body } = capture(new MulterError('LIMIT_FILE_SIZE', 'resume'));
    expect(status).toBe(400);
    expect(body).toEqual({ success: false, message: 'File is too large.' });
  });

  it('translates a multer field failure into the upload guidance message', () => {
    const { status, body } = capture(new MulterError('LIMIT_UNEXPECTED_FILE', 'file'));
    expect(status).toBe(400);
    expect(body).toEqual({ success: false, message: 'Invalid file type. Only PDFs allowed!' });
  });

  it('never leaks internals from an unexpected failure', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const { status, body } = capture(
      new Error('connect ECONNREFUSED 10.0.0.5:3306 — SELECT * FROM Users'),
    );

    expect(status).toBe(500);
    expect(body).toEqual({ success: false, message: 'Internal server error.' });
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
    expect(JSON.stringify(body)).not.toContain('SELECT');
  });

  it('logs unexpected failures so they are diagnosable server-side', () => {
    const spy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    capture(new Error('boom'));

    expect(spy).toHaveBeenCalledTimes(1);
    // First argument is the request line, second is the stack trace.
    const logged = (spy.mock.calls[0] ?? []).map(String).join(' ');
    expect(logged).toContain('boom');
    expect(logged).toContain('500');
  });

  it('emits exactly the two documented keys on every failure', () => {
    // `new Error('boom')` takes the 500 path, which logs the stack to console.
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    for (const exception of [new NotFoundError(), new Error('boom')]) {
      expect(Object.keys(capture(exception).body).sort()).toEqual(['message', 'success']);
    }
  });
});
