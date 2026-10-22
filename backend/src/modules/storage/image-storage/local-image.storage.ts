import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import type { ImageStorage } from './image-storage';

/** Default storage engine: writes into `<uploads>/<folder>/` and returns a path served by the API's static middleware. */
export class LocalImageStorage implements ImageStorage {
  /** @param rootDirectory Absolute uploads root (e.g. `<cwd>/uploads`). */
  constructor(private readonly rootDirectory: string) {}

  async upload(buffer: Buffer, folder: string, originalName: string): Promise<string> {
    const safeFolder = this.sanitize(folder);
    const extension = (extname(originalName) || '.png').toLowerCase();
    const filename = `${Date.now()}-${randomBytes(6).toString('hex')}${extension}`;
    const directory = resolve(this.rootDirectory, safeFolder);

    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, filename), buffer);

    return `/uploads/${safeFolder}/${filename}`;
  }

  /** Defence against `../` segments arriving from a crafted folder name. */
  private sanitize(folder: string): string {
    return folder
      .split(/[\\/]/)
      .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, ''))
      .filter(Boolean)
      .join('/');
  }
}
