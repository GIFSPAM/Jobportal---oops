import { randomBytes } from 'node:crypto';
import type { Response } from 'express';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { BadRequestError, NotFoundError } from '../../common/exceptions/domain.exceptions';

export interface StoredFile {
  /** Stable, portable reference persisted on the owning row (e.g. `/uploads/x.pdf`). */
  path: string;
  /** Client-facing original file name, shown in the UI. */
  filename: string;
}

/** Writes resumes to local disk. */
export class ResumeStorage {
  /** @param directory Absolute folder that holds uploaded resumes. */
  constructor(private readonly directory: string) {}

  save(buffer: Buffer | undefined, originalName?: string): StoredFile {
    if (!buffer?.length) {
      throw new BadRequestError('No file uploaded. Please select a PDF.');
    }

    const filename = `resume-${Date.now()}-${randomBytes(6).toString('hex')}.pdf`;
    mkdirSync(this.directory, { recursive: true });
    writeFileSync(resolve(this.directory, filename), buffer);

    return { path: `/uploads/resume/${filename}`, filename: originalName ?? filename };
  }

  /** Maps a stored `/uploads/resume/<file>` reference to an absolute path. */
  resolve(storedPath: string): string {
    const filename = storedPath.split(/[\\/]/).pop() ?? '';
    if (!filename || filename.includes('..')) {
      throw new BadRequestError('Invalid resume path.');
    }
    return resolve(this.directory, filename);
  }

  /** File name used for the `Content-Disposition` header. */
  downloadName(storedPath: string, fallback: string): string {
    const filename = storedPath.split(/[\\/]/).pop() ?? '';
    return extname(filename) ? filename : fallback;
  }

  /** Streams an already-resolved file to an open HTTP response. */
  async stream(absolutePath: string, filename: string, response: Response): Promise<void> {
    if (!existsSync(absolutePath)) {
      throw new NotFoundError('Resume file missing on server.');
    }

    await new Promise<void>((done, fail) => {
      response.download(absolutePath, filename, (error) => {
        if (error && !response.headersSent) fail(error);
        else done();
      });
    });
  }
}
