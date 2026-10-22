import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';
import { ApiResult } from '../interfaces/api-response.interface';

const context = {} as ExecutionContext;

/** Feeds `value` through the interceptor as if a controller had returned it. */
async function run(value: unknown): Promise<unknown> {
  const next = { handle: () => of(value) } as CallHandler;
  return lastValueFrom(new ResponseEnvelopeInterceptor().intercept(context, next));
}

describe('ResponseEnvelopeInterceptor', () => {
  it('wraps a plain payload as data', async () => {
    const job = { job_id: 1, title: 'Engineer' };
    await expect(run(job)).resolves.toEqual({ success: true, data: job });
  });

  it('reports an empty controller return as a bare success', async () => {
    await expect(run(undefined)).resolves.toEqual({ success: true });
    await expect(run(null)).resolves.toEqual({ success: true });
  });

  it('carries a message without inventing a data key', async () => {
    await expect(run(ApiResult.withMessage('Job verified successfully.'))).resolves.toEqual({
      success: true,
      message: 'Job verified successfully.',
    });
  });

  it('attaches data alongside a message', async () => {
    await expect(run(ApiResult.withData({ job_id: 7 }, { message: 'Created.' }))).resolves.toEqual({
      success: true,
      message: 'Created.',
      data: { job_id: 7 },
    });
  });

  it('emits count only when the controller asked for one', async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    await expect(run(ApiResult.withCount(rows, 2))).resolves.toEqual({
      success: true,
      data: rows,
      count: 2,
    });

    const listed = await run(ApiResult.withData(rows));
    expect(listed).not.toHaveProperty('count');
  });

  it('never lets a controller emit a failure envelope by accident', async () => {
    // Controllers signal failure by throwing; a returned value is always a success.
    const result = (await run({ success: false })) as { success: unknown };
    expect(result.success).toBe(true);
  });
});
