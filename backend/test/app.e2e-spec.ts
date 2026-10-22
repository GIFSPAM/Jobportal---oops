import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

/**
 * Boot-level end-to-end checks.
 *
 * The original scaffold test asserted `GET /` → `Hello World!`, which could
 * never pass: this application ships no root controller and `main.ts` mounts
 * every route under the `api` prefix. The suite therefore mirrors that
 * bootstrap and asserts the two contract properties every client relies on —
 * the prefixed public surface, and authentication on everything else.
 */
describe('Application (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Same routing contract as main.ts.
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('serves the public job feed under /api with the standard envelope', () =>
    request(app.getHttpServer())
      .get('/api/public/landing-jobs')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ success: true });
        expect(Array.isArray(body.data)).toBe(true);
      }));

  it('rejects an unauthenticated request to a protected route', () =>
    request(app.getHttpServer())
      .get('/api/seeker/profile')
      .expect(401)
      .expect(({ body }) => {
        expect(body.success).toBe(false);
        expect(typeof body.message).toBe('string');
      }));
});
