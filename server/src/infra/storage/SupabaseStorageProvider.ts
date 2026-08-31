import { createClient, SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { env } from '../../config/env';
import { StorageProvider, UploadOptions, UploadResult, AvifVariantOptions, AvifVariantResult } from './StorageProvider';
import { logger } from '../../config/logger';

function sanitizeFilename(name: string) {
  const base = path.basename(name, path.extname(name)).toLowerCase();
  const sanitized = base.replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
  return sanitized || 'image';
}

export class SupabaseStorageProvider implements StorageProvider {
  private client: SupabaseClient;
  private bucket: string;

  constructor(client?: SupabaseClient, bucket?: string) {
    this.client =
      client ??
      createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
      });
    this.bucket = bucket ?? env.SUPABASE_STORAGE_BUCKET;
  }

  async uploadImage(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const now = new Date();
    const folder = `images/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const convertToWebp = options?.convertToWebp !== false && mimeType !== 'image/gif';
    const maxWidth = options?.maxWidth ?? 1920;
    const maxHeight = options?.maxHeight ?? 1920;

    const image = sharp(buffer).rotate().resize({
      width: maxWidth,
      height: maxHeight,
      fit: 'inside',
      withoutEnlargement: true
    });

    let processedBuffer: Buffer;
    let targetMime = mimeType;
    let extension = path.extname(filename) || '.jpg';

    if (convertToWebp) {
      processedBuffer = await image.webp({ quality: 82 }).toBuffer();
      targetMime = 'image/webp';
      extension = '.webp';
    } else {
      processedBuffer = await image.toBuffer();
    }

    const metadata = await sharp(processedBuffer).metadata();
    const width = metadata.width ?? null;
    const height = metadata.height ?? null;

    const targetPath = `${folder}/${uuid()}-${sanitizeFilename(filename)}${extension}`;

    const { error } = await this.client.storage.from(this.bucket).upload(targetPath, processedBuffer, {
      contentType: targetMime,
      cacheControl: options?.cacheControl ?? '3600',
      upsert: false
    });

    if (error) {
      throw error;
    }

    const url = await this.getPublicUrl(targetPath);

    return {
      url,
      path: targetPath,
      width,
      height,
      size: processedBuffer.byteLength,
      mimeType: targetMime
    };
  }

  async uploadAvifVariant(
    buffer: Buffer,
    basePath: string,
    options?: AvifVariantOptions
  ): Promise<AvifVariantResult> {
    const maxWidth = options?.maxWidth ?? 1920;
    const maxHeight = options?.maxHeight ?? 1920;

    const avifBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true })
      .avif({ quality: 50 })
      .toBuffer();

    const targetPath = basePath.replace(/\.[^./]+$/, '.avif');

    const { error } = await this.client.storage.from(this.bucket).upload(targetPath, avifBuffer, {
      contentType: 'image/avif',
      cacheControl: '86400',
      upsert: false
    });

    if (error) {
      throw error;
    }

    const url = await this.getPublicUrl(targetPath);

    return { url, path: targetPath, size: avifBuffer.byteLength };
  }

  async delete(filePath: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([filePath]);
    if (error) {
      logger.error({ err: error }, '[storage] Failed to delete object');
    }
  }

  async getPublicUrl(filePath: string): Promise<string> {
    const { data } = this.client.storage.from(this.bucket).getPublicUrl(filePath);
    if (data?.publicUrl) return data.publicUrl;
    return this.createSignedUrl(filePath, 60 * 60);
  }

  async createSignedUrl(filePath: string, expiresIn: number): Promise<string> {
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUrl(filePath, expiresIn);
    if (error || !data?.signedUrl) {
      throw error ?? new Error('Unable to create signed URL');
    }
    return data.signedUrl;
  }

  async ensureBucketExists(): Promise<void> {
    // Buckets do Supabase Storage vivem no projeto Storage, não no Postgres
    // apontado por DATABASE_URL — por isso não dá pra criar via migration do
    // Prisma (que roda contra o banco relacional, que pode nem ser o mesmo
    // projeto Supabase). Chamamos a Storage Admin API aqui, uma vez por boot.
    const allowedMimeTypes = Array.from(
      new Set([
        ...env.ALLOWED_IMAGE_MIME_TYPES.split(',').map((type) => type.trim()),
        'image/webp',
        'image/avif'
      ])
    );

    const { error } = await this.client.storage.createBucket(this.bucket, {
      public: true,
      fileSizeLimit: `${env.UPLOAD_MAX_FILE_SIZE_MB}MB`,
      allowedMimeTypes
    });

    if (error && !/already exists/i.test(error.message)) {
      throw error;
    }
  }
}
