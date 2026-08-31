import { Media, Prisma } from '@prisma/client';
import { MediaRepository } from '../repositories/media.repository';
import { storageProvider } from '../config/storage';
import { HttpError } from '../utils/errors';
import { env } from '../config/env';
import { cacheKeys, cacheProvider } from '../config/cache';
import { logger } from '../config/logger';
import { AuditActor, auditLogService } from './auditLog.service';

const repository = new MediaRepository();
const allowedTypes = env.ALLOWED_IMAGE_MIME_TYPES.split(',').map((t) => t.trim());
const maxBytes = env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024;

type MediaMeta = {
  alt?: string;
  title?: string;
  description?: string;
  tags?: string[];
};

type ListOptions = {
  search?: string;
  tag?: string;
};

export class MediaService {
  async list(opts: ListOptions = {}): Promise<Media[]> {
    return repository.list(opts);
  }

  async upload(file: Express.Multer.File | undefined, meta: MediaMeta = {}, actor: AuditActor): Promise<Media> {
    if (!file) throw new HttpError(400, 'File is required');
    if (!file.mimetype.startsWith('image/')) throw new HttpError(400, 'Only image uploads are allowed');
    if (!allowedTypes.includes(file.mimetype)) throw new HttpError(400, 'Unsupported image type');
    if (file.size > maxBytes) throw new HttpError(400, 'Image exceeds ' + env.UPLOAD_MAX_FILE_SIZE_MB + 'MB');

    const uploadResult = await storageProvider.uploadImage(file.buffer, file.originalname, file.mimetype, {
      cacheControl: '86400',
      maxWidth: 1920,
      maxHeight: 1920,
      convertToWebp: true
    });

    const media = await repository.create({
      path: uploadResult.path,
      url: uploadResult.url,
      bucket: env.SUPABASE_STORAGE_BUCKET,
      mimeType: uploadResult.mimeType,
      size: uploadResult.size,
      width: uploadResult.width ?? undefined,
      height: uploadResult.height ?? undefined,
      alt: meta.alt ?? null,
      title: meta.title ?? null,
      description: meta.description ?? null,
      tags: meta.tags ?? []
    });

    await cacheProvider.delPrefix(`${cacheKeys.postsList}:`);
    this.generateAvifVariant(media.id, file.buffer, uploadResult.path, file.mimetype);
    await auditLogService.record({
      actor,
      action: 'upload',
      entity: 'media',
      entityId: media.id,
      entityLabel: file.originalname
    });
    return media;
  }

  async update(id: string, file: Express.Multer.File | undefined, meta: Partial<MediaMeta> = {}, actor: AuditActor): Promise<Media> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Media not found');

    let uploadResult: Awaited<ReturnType<typeof storageProvider.uploadImage>> | null = null;
    if (file) {
      if (!file.mimetype.startsWith('image/')) throw new HttpError(400, 'Only image uploads are allowed');
      if (!allowedTypes.includes(file.mimetype)) throw new HttpError(400, 'Unsupported image type');
      if (file.size > maxBytes) throw new HttpError(400, 'Image exceeds ' + env.UPLOAD_MAX_FILE_SIZE_MB + 'MB');

      await storageProvider.delete(existing.path);
      if (existing.avifPath) {
        await storageProvider.delete(existing.avifPath);
      }
      uploadResult = await storageProvider.uploadImage(file.buffer, file.originalname, file.mimetype, {
        cacheControl: '86400',
        maxWidth: 1920,
        maxHeight: 1920,
        convertToWebp: true
      });
    }

    const updated = await repository.update(id, {
      ...(meta.alt !== undefined && { alt: meta.alt }),
      ...(meta.title !== undefined && { title: meta.title }),
      ...(meta.description !== undefined && { description: meta.description }),
      ...(meta.tags !== undefined && { tags: meta.tags }),
      ...(uploadResult && {
        path: uploadResult.path,
        url: uploadResult.url,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size,
        width: uploadResult.width ?? undefined,
        height: uploadResult.height ?? undefined,
        // O arquivo trocou: o AVIF antigo aponta pra imagem anterior. Zera o
        // ponteiro na mesma request (o job em background repopula ao terminar,
        // ou deixa null se falhar/for GIF) pra nunca servir a imagem errada.
        avifUrl: null,
        avifPath: null,
        avifSize: null
      })
    });

    await cacheProvider.delPrefix(`${cacheKeys.postsList}:`);
    if (file && uploadResult) {
      this.generateAvifVariant(id, file.buffer, uploadResult.path, file.mimetype);
    }
    await auditLogService.record({
      actor,
      action: 'update',
      entity: 'media',
      entityId: updated.id,
      entityLabel: this.resolveLabel(updated)
    });
    return updated;
  }

  async delete(id: string, actor: AuditActor): Promise<void> {
    const media = await repository.findById(id);
    if (!media) throw new HttpError(404, 'Media not found');
    await storageProvider.delete(media.path);
    if (media.avifPath) {
      await storageProvider.delete(media.avifPath);
    }
    await repository.delete(id);
    await cacheProvider.delPrefix(`${cacheKeys.postsList}:`);
    await auditLogService.record({
      actor,
      action: 'delete',
      entity: 'media',
      entityId: media.id,
      entityLabel: this.resolveLabel(media)
    });
  }

  async saveCrop(id: string, cropData: {
    cropX: number;
    cropY: number;
    cropWidth: number;
    cropHeight: number;
    cropRatio?: string;
  }, actor: AuditActor): Promise<Media> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Media not found');

    const updated = await repository.update(id, {
      cropX: cropData.cropX,
      cropY: cropData.cropY,
      cropWidth: cropData.cropWidth,
      cropHeight: cropData.cropHeight,
      cropRatio: cropData.cropRatio ?? null
    });

    await cacheProvider.delPrefix(`${cacheKeys.postsList}:`);
    await auditLogService.record({
      actor,
      action: 'update',
      entity: 'media',
      entityId: updated.id,
      entityLabel: this.resolveLabel(updated)
    });
    return updated;
  }

  // Media não tem "nome" próprio — usa título/alt cadastrados ou, na
  // ausência de ambos, o nome do arquivo extraído do path de storage.
  private resolveLabel(media: Pick<Media, 'title' | 'alt' | 'path'>): string {
    return media.title || media.alt || media.path.split('/').pop() || media.path;
  }

  /**
   * Fire-and-forget: never awaited by callers. Encodes and uploads the
   * AVIF variant, then patches the Media row. Any failure (encode, upload,
   * or the row having been deleted mid-flight) is logged and swallowed —
   * the upload/update response was already sent before this runs.
   */
  private async generateAvifVariant(
    mediaId: string,
    buffer: Buffer,
    webpPath: string,
    mimeType: string
  ): Promise<void> {
    if (mimeType === 'image/gif') return;

    try {
      const avifResult = await storageProvider.uploadAvifVariant(buffer, webpPath, {
        maxWidth: 1920,
        maxHeight: 1920
      });
      await repository.update(mediaId, {
        avifUrl: avifResult.url,
        avifPath: avifResult.path,
        avifSize: avifResult.size
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return;
      }
      logger.error({ err, mediaId }, '[media] Failed to generate AVIF variant');
    }
  }
}
