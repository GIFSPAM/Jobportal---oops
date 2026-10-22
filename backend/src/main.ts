import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { join, resolve } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Every endpoint lives under the /api prefix.
  app.setGlobalPrefix('api');

  app.enableCors({ origin: true, credentials: true });

  /** Uploaded imagery (avatars, company logos) is served read-only from disk. */
  const config = app.get(ConfigService);
  const uploadsRoot = resolve(process.cwd(), config.get<string>('storage.uploadsDir') ?? 'uploads');
  app.useStaticAssets(join(uploadsRoot, 'profile_pics'), { prefix: '/uploads/profile_pics/' });

  /** `whitelist` strips anything without a validation decorator, which is how broad DTOs (a role registering a superset of fields) end up persisting only the columns they actually own. */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.enableShutdownHooks();

  const port = config.get<number>('port') ?? 5000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`API listening on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
