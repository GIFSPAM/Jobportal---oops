import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'node:path';
import { Application } from '../../database/entities';
import { ImageStorage } from './image-storage/image-storage';
import { CloudinaryImageStorage } from './image-storage/cloudinary-image.storage';
import { LocalImageStorage } from './image-storage/local-image.storage';
import { ResumeDownloadController } from './resume-download.controller';
import { ResumeStorage } from './resume-storage.service';

/** File persistence. */
@Module({
  imports: [TypeOrmModule.forFeature([Application])],
  controllers: [ResumeDownloadController],
  providers: [
    {
      provide: ResumeStorage,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new ResumeStorage(resolve(process.cwd(), config.get<string>('storage.uploadsDir') ?? 'uploads', 'resume')),
    },
    {
      provide: ImageStorage,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const credentials = config.get<{
          cloudName: string;
          apiKey: string;
          apiSecret: string;
        }>('storage.cloudinary');

        const hasCloudinary =
          Boolean(credentials?.cloudName) &&
          Boolean(credentials?.apiKey) &&
          Boolean(credentials?.apiSecret);

        if (hasCloudinary && credentials) {
          return new CloudinaryImageStorage(credentials);
        }

        return new LocalImageStorage(
          resolve(process.cwd(), config.get<string>('storage.uploadsDir') ?? 'uploads'),
        );
      },
    },
  ],
  exports: [ResumeStorage, ImageStorage],
})
export class StorageModule {}
