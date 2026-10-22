import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import * as multer from 'multer';
import { BadRequestError } from '../../common/exceptions/domain.exceptions';

/** Upload configuration. */
const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** PDF-only, 10 MB max. */
export const RESUME_UPLOAD_OPTIONS: MulterOptions = {
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new BadRequestError('Invalid file type. Only PDFs allowed!'), false);
      return;
    }
    cb(null, true);
  },
};

/** JPG/PNG-only, 5 MB max. */
export const IMAGE_UPLOAD_OPTIONS: MulterOptions = {
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      cb(new BadRequestError('Only JPG, JPEG, and PNG images are supported.'), false);
      return;
    }
    cb(null, true);
  },
};
