import { v2 as cloudinary } from 'cloudinary';
import type { ImageStorage } from './image-storage';

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/** CDN-backed storage engine, selected when Cloudinary credentials are present. */
export class CloudinaryImageStorage implements ImageStorage {
  constructor(credentials: CloudinaryCredentials) {
    cloudinary.config({
      cloud_name: credentials.cloudName,
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
      secure: true,
    });
  }

  upload(buffer: Buffer, folder: string, originalName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          public_id: originalName.replace(/\.[^.]+$/, ''),
          overwrite: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed.'));
            return;
          }
          resolve(result.secure_url);
        },
      );

      stream.end(buffer);
    });
  }
}
