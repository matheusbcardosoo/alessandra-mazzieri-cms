import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth';
import { requireSection } from '../../middleware/permissions';
import { env } from '../../config/env';
import { deleteMedia, listMedia, updateMedia, uploadMedia, saveCrop } from './media.controller';

const allowedTypes = env.ALLOWED_IMAGE_MIME_TYPES.split(',').map((t) => t.trim());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/') || !allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  }
});

export const mediaRoutes = Router();

mediaRoutes.use(requireAuth, requireSection('media'));
mediaRoutes.get('/admin/media', listMedia);
mediaRoutes.post('/admin/media/upload', upload.single('file'), uploadMedia);
mediaRoutes.put('/admin/media/:id', upload.single('file'), updateMedia);
mediaRoutes.put('/admin/media/:id/crop', saveCrop);
mediaRoutes.delete('/admin/media/:id', deleteMedia);
