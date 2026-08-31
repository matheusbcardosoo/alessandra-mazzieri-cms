# AVIF Image Variant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate an AVIF variant of every uploaded image in the background (fire-and-forget, no job queue) and serve it via `<picture>` with WebP fallback in the 6 blocks that render content images.

**Architecture:** The existing synchronous upload pipeline (resize → WebP → save `Media` → respond) is untouched. Right after building the response, `MediaService.upload()`/`update()` fire an un-awaited `generateAvifVariant()` call that encodes AVIF from the original buffer, uploads it next to the WebP file (same path, `.avif` extension), and patches the `Media` row when done. A new `OptimizedImage` client component renders `<picture><source type="image/avif">…<img>…</picture>` and replaces the 9 raw `<img>` occurrences across 6 blocks.

**Tech Stack:** Express 5 + Prisma + `sharp` (server), React 19 + TypeScript strict (client), Vitest on both sides.

**Spec:** `docs/superpowers/specs/2026-08-26-image-avif-optimization-design.md`

## Global Constraints

- All three new `Media` columns (`avifUrl`, `avifPath`, `avifSize`) are nullable — generation can permanently fail or never run (no retry, no persistent queue).
- No backfill: only media uploaded/re-uploaded after this change ever gets an AVIF variant.
- GIF uploads never get an AVIF variant (`sharp` can't preserve animation encoding to AVIF).
- AVIF quality is fixed at `50` (perceptual equivalent to the existing WebP `82`), same resize params as the WebP pipeline (`maxWidth`/`maxHeight` 1920, `fit: inside`, no upscale).
- Any error in the background AVIF job (encode, upload, or the record having been deleted mid-flight) is caught, logged via `logger.error`, and never propagates — the main upload/update response is already sent before the job even starts.
- The picker payload field and every block-data sibling field added in this plan is named literally `avifSrc` (client) / `avifUrl` (server `Media` column and API responses) — do not invent per-block-prefixed names (e.g. not `imageAvifUrl`, not `iconImageAvifSrc`).
- `client/src/components/StyleControls/BackgroundPicker.tsx` is explicitly out of scope — do not touch it.

---

### Task 1: Prisma schema — add AVIF columns to `Media`

**Files:**
- Modify: `server/prisma/schema.prisma:92-114` (`Media` model)

**Interfaces:**
- Produces: `Media.avifUrl: string | null`, `Media.avifPath: string | null`, `Media.avifSize: number | null` — every later server task reads/writes these via the regenerated Prisma client.

- [ ] **Step 1: Add the three nullable columns**

In `server/prisma/schema.prisma`, inside `model Media`, add the new fields right after `size`:

```prisma
model Media {
  id          String   @id @default(uuid())
  path        String
  url         String
  bucket      String
  mimeType    String
  size        Int
  avifUrl     String?
  avifPath    String?
  avifSize    Int?
  width       Int?
  height      Int?
  alt         String?
  title       String?
  description String?
  tags        String[] @default([])
  // Crop data fields
  cropX       Float?
  cropY       Float?
  cropWidth   Float?
  cropHeight  Float?
  cropRatio   String?  // "16:9", "1:1", "4:3", "free"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  posts       Post[]   @relation("PostCoverMedia")
}
```

> **Correção (pós-incidente):** a premissa do Step 2 abaixo está errada — este repositório **tem** histórico de migrations em `server/prisma/migrations/` (`20260810014626_init`), e usar `db push` aqui gerou drift: as colunas AVIF foram parar no banco de dev sem migration correspondente, o que quebraria um banco novo criado via `prisma migrate deploy`. Para qualquer mudança de schema FUTURA neste repo, gere uma migration adequada (`prisma migrate dev --name <nome>`) e commite o arquivo, em vez de `npm run db:push`.

- [ ] **Step 2: Push the schema change and regenerate the Prisma client**

Run from `server/`:

```bash
npm run db:push
```

This repo has no committed migration history yet (`server/prisma/migrations/` only contains `migration_lock.toml`), so schema changes are applied with `prisma db push`, not `prisma migrate dev` — `db push` also regenerates the Prisma client automatically. If it fails to connect, start the local Postgres/Redis stack first with `npm run docker:up` from the repo root, then retry.

- [ ] **Step 3: Verify the generated client has the new fields**

Run: `npx prisma format && npx prisma validate` (from `server/`)
Expected: both commands exit 0 with no output beyond a formatted schema confirmation.

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat(server): add nullable AVIF columns to Media"
```

---

### Task 2: `StorageProvider.uploadAvifVariant` + bucket mimetype allowlist

**Files:**
- Modify: `server/src/infra/storage/StorageProvider.ts`
- Modify: `server/src/infra/storage/SupabaseStorageProvider.ts`
- Test: `server/src/infra/storage/SupabaseStorageProvider.test.ts` (new)

**Interfaces:**
- Consumes: nothing new (uses `sharp`, already a dependency).
- Produces: `StorageProvider.uploadAvifVariant(buffer: Buffer, basePath: string, options?: { maxWidth?: number; maxHeight?: number }): Promise<{ url: string; path: string; size: number }>` — consumed by `MediaService.generateAvifVariant` in Task 3.

- [ ] **Step 1: Add the method to the `StorageProvider` interface**

In `server/src/infra/storage/StorageProvider.ts`, add a new exported type and the interface method:

```ts
export type UploadResult = {
  url: string;
  path: string;
  width: number | null;
  height: number | null;
  size: number;
  mimeType: string;
};

export type AvifVariantResult = {
  url: string;
  path: string;
  size: number;
};

export type UploadOptions = {
  cacheControl?: string;
  convertToWebp?: boolean;
  maxWidth?: number;
  maxHeight?: number;
};

export type AvifVariantOptions = {
  maxWidth?: number;
  maxHeight?: number;
};

export interface StorageProvider {
  uploadImage(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<UploadResult>;
  /**
   * Encodes `buffer` to AVIF and uploads it next to an already-uploaded
   * WebP variant. `basePath` is the `path` returned by `uploadImage` (e.g.
   * `images/2026/08/uuid-nome.webp`) — the implementation swaps the
   * extension to `.avif`, keeping both variants in the same directory
   * under the same identifier.
   */
  uploadAvifVariant(
    buffer: Buffer,
    basePath: string,
    options?: AvifVariantOptions
  ): Promise<AvifVariantResult>;
  delete(path: string): Promise<void>;
  getPublicUrl(path: string): Promise<string>;
  createSignedUrl(path: string, expiresIn: number): Promise<string>;
  /**
   * Garante que o bucket de mídia exista antes do primeiro upload (cria se
   * necessário). Idempotente — chamar em todo boot do servidor é seguro.
   */
  ensureBucketExists(): Promise<void>;
}
```

- [ ] **Step 2: Write the failing test for `uploadAvifVariant`**

Create `server/src/infra/storage/SupabaseStorageProvider.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const mockToBuffer = vi.fn();
const mockAvif = vi.fn(() => ({ toBuffer: mockToBuffer }));
const mockResize = vi.fn(() => ({ avif: mockAvif }));
const mockRotate = vi.fn(() => ({ resize: mockResize }));
const mockSharp = vi.fn(() => ({ rotate: mockRotate }));

vi.mock('sharp', () => ({ default: mockSharp }));

import { SupabaseStorageProvider } from './SupabaseStorageProvider';

function makeFakeClient(uploadMock: ReturnType<typeof vi.fn>, publicUrl: string) {
  return {
    storage: {
      from: vi.fn(() => ({
        upload: uploadMock,
        getPublicUrl: vi.fn(() => ({ data: { publicUrl } }))
      }))
    }
  } as unknown as SupabaseClient;
}

describe('SupabaseStorageProvider.uploadAvifVariant', () => {
  beforeEach(() => {
    mockSharp.mockClear();
    mockRotate.mockClear();
    mockResize.mockClear();
    mockAvif.mockClear();
    mockToBuffer.mockReset();
  });

  it('swaps the source extension for .avif, resizes/encodes at quality 50, and uploads with the AVIF content type', async () => {
    const avifBuffer = Buffer.from('fake-avif-bytes');
    mockToBuffer.mockResolvedValue(avifBuffer);

    const uploadMock = vi.fn().mockResolvedValue({ error: null });
    const client = makeFakeClient(uploadMock, 'https://cdn.test/images/2026/08/uuid-nome.avif');
    const provider = new SupabaseStorageProvider(client, 'media-bucket');

    const result = await provider.uploadAvifVariant(
      Buffer.from('original-bytes'),
      'images/2026/08/uuid-nome.webp',
      { maxWidth: 1920, maxHeight: 1920 }
    );

    expect(mockResize).toHaveBeenCalledWith({
      width: 1920,
      height: 1920,
      fit: 'inside',
      withoutEnlargement: true
    });
    expect(mockAvif).toHaveBeenCalledWith({ quality: 50 });
    expect(uploadMock).toHaveBeenCalledWith(
      'images/2026/08/uuid-nome.avif',
      avifBuffer,
      expect.objectContaining({ contentType: 'image/avif' })
    );
    expect(result).toEqual({
      url: 'https://cdn.test/images/2026/08/uuid-nome.avif',
      path: 'images/2026/08/uuid-nome.avif',
      size: avifBuffer.byteLength
    });
  });

  it('defaults to 1920x1920 when no options are passed', async () => {
    mockToBuffer.mockResolvedValue(Buffer.from('x'));
    const uploadMock = vi.fn().mockResolvedValue({ error: null });
    const client = makeFakeClient(uploadMock, 'https://cdn.test/img.avif');
    const provider = new SupabaseStorageProvider(client, 'media-bucket');

    await provider.uploadAvifVariant(Buffer.from('original'), 'images/2026/08/id-name.webp');

    expect(mockResize).toHaveBeenCalledWith({
      width: 1920,
      height: 1920,
      fit: 'inside',
      withoutEnlargement: true
    });
  });

  it('throws when the Supabase upload call returns an error', async () => {
    mockToBuffer.mockResolvedValue(Buffer.from('x'));
    const uploadMock = vi.fn().mockResolvedValue({ error: new Error('bucket rejected mimetype') });
    const client = makeFakeClient(uploadMock, 'https://cdn.test/img.avif');
    const provider = new SupabaseStorageProvider(client, 'media-bucket');

    await expect(
      provider.uploadAvifVariant(Buffer.from('original'), 'images/2026/08/id-name.webp')
    ).rejects.toThrow('bucket rejected mimetype');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd server && npx vitest run src/infra/storage/SupabaseStorageProvider.test.ts`
Expected: FAIL — `provider.uploadAvifVariant is not a function`.

- [ ] **Step 4: Implement `uploadAvifVariant` in `SupabaseStorageProvider`**

In `server/src/infra/storage/SupabaseStorageProvider.ts`, update the import line and add the method (after `uploadImage`, before `delete`):

```ts
import { StorageProvider, UploadOptions, UploadResult, AvifVariantOptions, AvifVariantResult } from './StorageProvider';
```

```ts
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
```

- [ ] **Step 5: Add `image/avif` to the bucket's allowed mimetypes**

In `ensureBucketExists`, `server/src/infra/storage/SupabaseStorageProvider.ts:113-115`, add `'image/avif'` alongside the existing `'image/webp'` addition — otherwise Supabase Storage rejects the AVIF upload with an unsupported-mimetype error:

```ts
    const allowedMimeTypes = Array.from(
      new Set([
        ...env.ALLOWED_IMAGE_MIME_TYPES.split(',').map((type) => type.trim()),
        'image/webp',
        'image/avif'
      ])
    );
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd server && npx vitest run src/infra/storage/SupabaseStorageProvider.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add server/src/infra/storage/StorageProvider.ts server/src/infra/storage/SupabaseStorageProvider.ts server/src/infra/storage/SupabaseStorageProvider.test.ts
git commit -m "feat(server): add StorageProvider.uploadAvifVariant"
```

---

### Task 3: `MediaService` — fire-and-forget AVIF generation

**Files:**
- Modify: `server/src/services/media.service.ts`
- Test: `server/src/services/media.service.test.ts` (new)

**Interfaces:**
- Consumes: `storageProvider.uploadAvifVariant` (Task 2), `Media.avifUrl/avifPath/avifSize` (Task 1).
- Produces: `MediaService.upload()`/`update()` behave exactly as before to their callers (same return shape), but now schedule a background job; `MediaService.delete()` also removes `avifPath` from storage when present.

- [ ] **Step 1: Write the failing tests**

Create `server/src/services/media.service.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

const mockRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  list: vi.fn()
}));

vi.mock('../repositories/media.repository', () => ({
  MediaRepository: vi.fn().mockImplementation(function MediaRepository() {
    return mockRepo;
  })
}));

const mockStorageProvider = vi.hoisted(() => ({
  uploadImage: vi.fn(),
  uploadAvifVariant: vi.fn(),
  delete: vi.fn(),
  getPublicUrl: vi.fn(),
  createSignedUrl: vi.fn(),
  ensureBucketExists: vi.fn()
}));

vi.mock('../config/storage', () => ({ storageProvider: mockStorageProvider }));

vi.mock('../config/env', () => ({
  env: {
    ALLOWED_IMAGE_MIME_TYPES: 'image/jpeg,image/png,image/webp,image/gif',
    UPLOAD_MAX_FILE_SIZE_MB: 5,
    SUPABASE_STORAGE_BUCKET: 'media'
  }
}));

vi.mock('../config/cache', () => ({
  cacheProvider: { delPrefix: vi.fn() },
  cacheKeys: { postsList: 'posts:list' }
}));

import { MediaService } from './media.service';

function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    buffer: Buffer.from('original-bytes'),
    mimetype: 'image/png',
    size: 1024,
    originalname: 'photo.png',
    ...overrides
  } as Express.Multer.File;
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MediaService();
    mockStorageProvider.uploadImage.mockResolvedValue({
      url: 'https://cdn.test/img.webp',
      path: 'images/2026/08/id-photo.webp',
      width: 800,
      height: 600,
      size: 2048,
      mimeType: 'image/webp'
    });
    mockRepo.create.mockResolvedValue({ id: 'media-1', path: 'images/2026/08/id-photo.webp' });
    mockRepo.findById.mockResolvedValue({
      id: 'media-1',
      path: 'images/2026/08/id-photo.webp',
      avifPath: null
    });
  });

  describe('upload()', () => {
    it('resolves before the background AVIF job settles, then patches the record once it does', async () => {
      let resolveAvif!: (value: { url: string; path: string; size: number }) => void;
      mockStorageProvider.uploadAvifVariant.mockReturnValue(
        new Promise((resolve) => {
          resolveAvif = resolve;
        })
      );

      const result = await service.upload(makeFile());

      expect(result.id).toBe('media-1');
      expect(mockRepo.update).not.toHaveBeenCalled();

      resolveAvif({ url: 'https://cdn.test/img.avif', path: 'images/2026/08/id-photo.avif', size: 1024 });
      await flush();

      expect(mockRepo.update).toHaveBeenCalledWith('media-1', {
        avifUrl: 'https://cdn.test/img.avif',
        avifPath: 'images/2026/08/id-photo.avif',
        avifSize: 1024
      });
    });

    it('does not reject when the background AVIF job fails', async () => {
      mockStorageProvider.uploadAvifVariant.mockRejectedValue(new Error('encode failed'));

      await expect(service.upload(makeFile())).resolves.toMatchObject({ id: 'media-1' });

      await flush();
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('skips AVIF generation entirely for GIF uploads', async () => {
      await service.upload(makeFile({ mimetype: 'image/gif' }));
      await flush();

      expect(mockStorageProvider.uploadAvifVariant).not.toHaveBeenCalled();
    });

    it('silently ignores a Prisma "record not found" error from the background patch', async () => {
      mockStorageProvider.uploadAvifVariant.mockResolvedValue({
        url: 'https://cdn.test/img.avif',
        path: 'images/2026/08/id-photo.avif',
        size: 1024
      });
      mockRepo.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '6.1.0'
        })
      );

      await service.upload(makeFile());
      await flush();

      expect(mockRepo.update).toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    beforeEach(() => {
      mockRepo.findById.mockResolvedValue({ id: 'media-1', path: 'images/2026/08/old.webp' });
      mockRepo.update.mockResolvedValue({ id: 'media-1' });
    });

    it('resolves before the background AVIF job settles when a new file is uploaded', async () => {
      let resolveAvif!: (value: { url: string; path: string; size: number }) => void;
      mockStorageProvider.uploadAvifVariant.mockReturnValue(
        new Promise((resolve) => {
          resolveAvif = resolve;
        })
      );

      await service.update('media-1', makeFile());
      expect(mockRepo.update).toHaveBeenCalledTimes(1); // only the synchronous metadata/path update so far

      resolveAvif({ url: 'https://cdn.test/img.avif', path: 'images/2026/08/id-photo.avif', size: 1024 });
      await flush();

      expect(mockRepo.update).toHaveBeenCalledTimes(2);
      expect(mockRepo.update).toHaveBeenLastCalledWith('media-1', {
        avifUrl: 'https://cdn.test/img.avif',
        avifPath: 'images/2026/08/id-photo.avif',
        avifSize: 1024
      });
    });

    it('does not trigger an AVIF job when only metadata changes (no file)', async () => {
      await service.update('media-1', undefined, { alt: 'novo alt' });
      await flush();

      expect(mockStorageProvider.uploadAvifVariant).not.toHaveBeenCalled();
    });
  });

  describe('delete()', () => {
    it('also removes the AVIF variant from storage when present', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'media-1',
        path: 'images/2026/08/id-photo.webp',
        avifPath: 'images/2026/08/id-photo.avif'
      });

      await service.delete('media-1');

      expect(mockStorageProvider.delete).toHaveBeenCalledWith('images/2026/08/id-photo.webp');
      expect(mockStorageProvider.delete).toHaveBeenCalledWith('images/2026/08/id-photo.avif');
    });

    it('does not try to remove an AVIF variant when none was generated', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'media-1',
        path: 'images/2026/08/id-photo.webp',
        avifPath: null
      });

      await service.delete('media-1');

      expect(mockStorageProvider.delete).toHaveBeenCalledTimes(1);
      expect(mockStorageProvider.delete).toHaveBeenCalledWith('images/2026/08/id-photo.webp');
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd server && npx vitest run src/services/media.service.test.ts`
Expected: FAIL — `mockStorageProvider.uploadAvifVariant` never called, `delete()` doesn't touch `avifPath`, etc.

- [ ] **Step 3: Implement the wiring in `MediaService`**

Replace the full contents of `server/src/services/media.service.ts`:

```ts
import { Media, Prisma } from '@prisma/client';
import { MediaRepository } from '../repositories/media.repository';
import { storageProvider } from '../config/storage';
import { HttpError } from '../utils/errors';
import { env } from '../config/env';
import { cacheKeys, cacheProvider } from '../config/cache';
import { logger } from '../config/logger';

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

  async upload(file: Express.Multer.File | undefined, meta: MediaMeta = {}): Promise<Media> {
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
    return media;
  }

  async update(id: string, file: Express.Multer.File | undefined, meta: Partial<MediaMeta> = {}): Promise<Media> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Media not found');

    let uploadResult: Awaited<ReturnType<typeof storageProvider.uploadImage>> | null = null;
    if (file) {
      if (!file.mimetype.startsWith('image/')) throw new HttpError(400, 'Only image uploads are allowed');
      if (!allowedTypes.includes(file.mimetype)) throw new HttpError(400, 'Unsupported image type');
      if (file.size > maxBytes) throw new HttpError(400, 'Image exceeds ' + env.UPLOAD_MAX_FILE_SIZE_MB + 'MB');

      await storageProvider.delete(existing.path);
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
        height: uploadResult.height ?? undefined
      })
    });

    await cacheProvider.delPrefix(`${cacheKeys.postsList}:`);
    if (file && uploadResult) {
      this.generateAvifVariant(id, file.buffer, uploadResult.path, file.mimetype);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    const media = await repository.findById(id);
    if (!media) throw new HttpError(404, 'Media not found');
    await storageProvider.delete(media.path);
    if (media.avifPath) {
      await storageProvider.delete(media.avifPath);
    }
    await repository.delete(id);
    await cacheProvider.delPrefix(`${cacheKeys.postsList}:`);
  }

  async saveCrop(id: string, cropData: {
    cropX: number;
    cropY: number;
    cropWidth: number;
    cropHeight: number;
    cropRatio?: string;
  }): Promise<Media> {
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
    return updated;
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd server && npx vitest run src/services/media.service.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/media.service.ts server/src/services/media.service.test.ts
git commit -m "feat(server): generate AVIF variant in background on media upload/update"
```

---

### Task 4: `uploadMedia` controller response includes `avifUrl`

**Files:**
- Modify: `server/src/modules/media/media.controller.ts:60-69`

**Interfaces:**
- Produces: the upload response payload gains `avifUrl: string | null` — consumed by `client/src/api/queries.ts`'s `uploadMedia` return type (Task 5) and `ImagePickerModal` (Task 6).

- [ ] **Step 1: Add `avifUrl` to the curated upload response**

In `server/src/modules/media/media.controller.ts`, update `uploadMedia`:

```ts
export async function uploadMedia(req: Request, res: Response) {
  const payload = uploadSchema.parse(req.body);
  const file = (req as Request).file as Express.Multer.File | undefined;
  const media = await service.upload(file, {
    alt: payload.alt,
    title: payload.title,
    description: payload.description,
    tags: parseTags(payload.tags)
  });
  return sendSuccess(res, {
    mediaId: media.id,
    url: media.url,
    avifUrl: media.avifUrl,
    width: media.width,
    height: media.height,
    alt: media.alt,
    title: media.title,
    description: media.description,
    tags: media.tags ?? []
  }, 201);
}
```

`updateMedia` and `saveCrop` already pass the full `media` record through `sendSuccess`, so `avifUrl` flows through them automatically once the Prisma client is regenerated (Task 1) — no change needed there.

- [ ] **Step 2: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: no errors (confirms `media.avifUrl` resolves on the regenerated Prisma type).

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/media/media.controller.ts
git commit -m "feat(server): include avifUrl in the media upload response"
```

---

### Task 5: Client `Media` type + `uploadMedia` API return type

**Files:**
- Modify: `client/src/types/auth.ts:27-45` (`Media`)
- Modify: `client/src/api/queries.ts:229-240` (`uploadMedia`)

**Interfaces:**
- Produces: `Media.avifUrl?: string | null`; `uploadMedia()` resolved value gains `avifUrl?: string | null`. Consumed by Task 6 (`ImagePickerModal`).

- [ ] **Step 1: Add `avifUrl` to the `Media` type**

In `client/src/types/auth.ts`, add the field after `url`:

```ts
export type Media = {
  id: string;
  url: string;
  avifUrl?: string | null;
  path?: string;
  bucket?: string;
  alt?: string | null;
  title?: string | null;
  description?: string | null;
  tags?: string[];
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  cropX?: number | null;
  cropY?: number | null;
  cropWidth?: number | null;
  cropHeight?: number | null;
  cropRatio?: '16:9' | '9:16' | '1:1' | '4:3' | 'free' | null;
};
```

- [ ] **Step 2: Add `avifUrl` to `uploadMedia`'s return type**

In `client/src/api/queries.ts:239`, change:

```ts
  return data.data as { mediaId: string; url: string; width?: number; height?: number; alt?: string | null };
```

to:

```ts
  return data.data as {
    mediaId: string;
    url: string;
    avifUrl?: string | null;
    width?: number;
    height?: number;
    alt?: string | null;
  };
```

- [ ] **Step 3: Typecheck**

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/types/auth.ts client/src/api/queries.ts
git commit -m "feat(client): add avifUrl to the Media type and upload response"
```

---

### Task 6: `ImagePickerModal` — thread `avifSrc` through `onSelect`

**Files:**
- Modify: `client/src/components/ImagePickerModal.tsx`

**Interfaces:**
- Consumes: `Media.avifUrl`, `uploadMedia()`'s `avifUrl` (Task 5).
- Produces: `onSelect` payload gains `avifSrc?: string | null` — consumed by every block `Form.tsx` in Tasks 9–14.

- [ ] **Step 1: Add `avifSrc` to the `onSelect` prop type**

In `client/src/components/ImagePickerModal.tsx:15`, change:

```ts
  onSelect: (image: { mediaId: string; src: string; alt: string; width?: number | null; height?: number | null; cropData?: CropData }) => void;
```

to:

```ts
  onSelect: (image: { mediaId: string; src: string; alt: string; width?: number | null; height?: number | null; cropData?: CropData; avifSrc?: string | null }) => void;
```

- [ ] **Step 2: Populate `avifSrc` on the upload success path (no-crop branch)**

In the `uploadMutation` `onSuccess` handler (~line 76-99), update the `else` branch and the `mediaForCrop` object so the value survives into the crop-confirm flow too:

```ts
  const uploadMutation = useMutation({
    mutationFn: uploadMedia,
    onSuccess: (newMedia) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
      if (enableCrop) {
        const mediaForCrop: Media = {
          id: newMedia.mediaId,
          url: newMedia.url,
          avifUrl: newMedia.avifUrl ?? null,
          alt: newMedia.alt,
          mimeType: 'image/jpeg',
          size: 0,
          width: newMedia.width,
          height: newMedia.height
        };
        setSelectedImageForCrop(mediaForCrop);
        setCropModalOpen(true);
      } else {
        onSelect({
          mediaId: newMedia.mediaId,
          src: newMedia.url,
          alt: newMedia.alt || '',
          width: newMedia.width ?? null,
          height: newMedia.height ?? null,
          avifSrc: newMedia.avifUrl ?? null
        });
        onClose();
      }
    },
    onError: (error: unknown) => {
      const msg = getApiErrorMessage(error, 'Nao foi possivel fazer o upload da imagem.');
      toast.error('Falha no upload', { message: msg, code: 'MEDIA-001' });
    }
  });
```

- [ ] **Step 3: Populate `avifSrc` on the library-select path**

Update `handleSelectImage` (~line 169-177):

```ts
  const handleSelectImage = (image: Media) => {
    if (enableCrop) {
      setSelectedImageForCrop(image);
      setCropModalOpen(true);
    } else {
      onSelect({
        mediaId: image.id,
        src: image.url,
        alt: image.alt || '',
        width: image.width ?? null,
        height: image.height ?? null,
        avifSrc: image.avifUrl ?? null
      });
      onClose();
    }
  };
```

- [ ] **Step 4: Populate `avifSrc` on the crop-confirm path**

Update `handleCropConfirm` (~line 179-197):

```ts
  const handleCropConfirm = async (cropData: CropData) => {
    if (!selectedImageForCrop) return;
    try {
      await cropMutation.mutateAsync({ mediaId: selectedImageForCrop.id, cropData });
      onSelect({
        mediaId: selectedImageForCrop.id,
        src: selectedImageForCrop.url,
        alt: selectedImageForCrop.alt || '',
        width: selectedImageForCrop.width ?? null,
        height: selectedImageForCrop.height ?? null,
        cropData,
        avifSrc: selectedImageForCrop.avifUrl ?? null
      });
      setCropModalOpen(false);
      setSelectedImageForCrop(null);
      onClose();
    } catch {
      toast.error('Falha ao salvar recorte', { message: 'Nao foi possivel salvar a configuracao de recorte.', code: 'MEDIA-004' });
    }
  };
```

- [ ] **Step 5: Typecheck**

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/ImagePickerModal.tsx
git commit -m "feat(client): thread avifSrc through ImagePickerModal onSelect"
```

---

### Task 7: `OptimizedImage` component

**Files:**
- Create: `client/src/components/OptimizedImage.tsx`
- Test: `client/src/components/OptimizedImage.test.tsx` (new)

**Interfaces:**
- Produces: `OptimizedImage({ src: string; avifSrc?: string | null } & Omit<ComponentPropsWithoutRef<'img'>, 'src'>)` — a drop-in `<img>` replacement, consumed by all 6 blocks in Tasks 9–14.

> This repo's existing React component tests (`client/src/components/PublicLayout.test.tsx`) use `renderToString` from `react-dom/server`, not React Testing Library — `@testing-library/react` isn't a client dependency. Follow the established pattern instead of adding a new dependency.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/OptimizedImage.test.tsx`:

```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { OptimizedImage } from './OptimizedImage';

describe('OptimizedImage', () => {
  test('renders a picture with an AVIF source and the fallback img when avifSrc is present', () => {
    const html = renderToString(<OptimizedImage src="/img.webp" avifSrc="/img.avif" alt="Foto" />);

    expect(html).toContain('<picture>');
    expect(html).toContain('<source');
    expect(html).toContain('type="image/avif"');
    expect(html).toContain('srcset="/img.avif"');
    expect(html).toContain('src="/img.webp"');
    expect(html).toContain('alt="Foto"');
  });

  test('omits the source element when avifSrc is null', () => {
    const html = renderToString(<OptimizedImage src="/img.webp" avifSrc={null} alt="Foto" />);

    expect(html).not.toContain('<source');
    expect(html).toContain('src="/img.webp"');
  });

  test('omits the source element when avifSrc is undefined', () => {
    const html = renderToString(<OptimizedImage src="/img.webp" alt="Foto" />);

    expect(html).not.toContain('<source');
    expect(html).toContain('src="/img.webp"');
  });

  test('forwards extra img props (className, loading, style) onto the fallback img', () => {
    const html = renderToString(
      <OptimizedImage src="/img.webp" avifSrc={null} alt="Foto" className="card-icon-img" loading="lazy" />
    );

    expect(html).toContain('class="card-icon-img"');
    expect(html).toContain('loading="lazy"');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd client && npx vitest run src/components/OptimizedImage.test.tsx`
Expected: FAIL — cannot find module `./OptimizedImage`.

- [ ] **Step 3: Implement the component**

Create `client/src/components/OptimizedImage.tsx`:

```tsx
import type { ComponentPropsWithoutRef } from 'react';

type OptimizedImageProps = {
  src: string;
  avifSrc?: string | null;
} & Omit<ComponentPropsWithoutRef<'img'>, 'src'>;

export function OptimizedImage({ src, avifSrc, ...imgProps }: OptimizedImageProps) {
  return (
    <picture>
      {avifSrc && <source type="image/avif" srcSet={avifSrc} />}
      <img src={src} {...imgProps} />
    </picture>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd client && npx vitest run src/components/OptimizedImage.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck**

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/OptimizedImage.tsx client/src/components/OptimizedImage.test.tsx
git commit -m "feat(client): add OptimizedImage picture/source/img component"
```

---

### Task 8: Block-data types gain `avifSrc`

**Files:**
- Modify: `client/src/types/blocks.ts`

**Interfaces:**
- Produces: `avifSrc?: string | null` on `ImageBlockData`, `MediaTextBlockData`, `CardItem`, `ServicesBlockItem`, `ServicesBlockData`, `CtaBlockData`, `HeroImage`, `HeroCard` — consumed by Tasks 9–14.

- [ ] **Step 1: `ImageBlockData`** (`client/src/types/blocks.ts:9-25`) — add sibling to `src`:

```ts
export type ImageBlockData = {
  mediaId?: string | null;
  src: string;
  avifSrc?: string | null;
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
  size?: 25 | 50 | 75 | 100;
  align?: 'left' | 'center' | 'right';
  cropRatio?: '16:9' | '9:16' | '1:1' | '4:3' | 'free';
  naturalWidth?: number | null;
  naturalHeight?: number | null;
  cropX?: number;
  heightPct?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
};
```

- [ ] **Step 2: `CardItem`** (`:39-50`) — add sibling to `iconImageUrl`:

```ts
export type CardItem = {
  id: string;
  icon?: string | null;
  iconType?: 'emoji' | 'image' | null;
  iconImageUrl?: string | null;
  avifSrc?: string | null;
  iconImageId?: string | null;
  iconAlt?: string | null;
  title: string;
  text: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};
```

- [ ] **Step 3: `HeroImage`** (`:97-102`) — add sibling to `url`:

```ts
export type HeroImage = {
  imageId?: string | null;
  url?: string | null;
  avifSrc?: string | null;
  alt?: string | null;
  focal?: { x: number; y: number; zoom: number } | null;
};
```

- [ ] **Step 4: `HeroCard`** (`:104-111`) — add sibling to `url`:

```ts
export type HeroCard = {
  title: string;
  text: string;
  icon?: string | null;
  imageId?: string | null;
  url?: string | null;
  avifSrc?: string | null;
  alt?: string | null;
};
```

- [ ] **Step 5: `ServicesBlockItem`** (`:203-216`) — add sibling to `iconImageUrl`:

```ts
export type ServicesBlockItem = {
  id: string;
  title: string;
  description?: string;
  href: string;
  linkMode?: 'page' | 'manual';
  pageId?: string | null;
  pageKey?: string | null;
  slug?: string | null;
  /** Ícone próprio do item. Se vazio, usa o ícone padrão do bloco (ou o ícone padrão da marca). */
  iconImageId?: string | null;
  iconImageUrl?: string | null;
  avifSrc?: string | null;
  iconAlt?: string | null;
};
```

- [ ] **Step 6: `ServicesBlockData`** (`:218-232`) — add sibling to the block-level default `iconImageUrl`:

```ts
export type ServicesBlockData = {
  sectionTitle: string;
  items: ServicesBlockItem[];
  buttonLabel?: string;
  /** Cor do texto (título e descrição de cada item): 'default' = cor padrão do tema; 'custom' = cor escolhida */
  textColorMode?: 'default' | 'custom';
  textColor?: string | null;
  /** Cor do botão "Saiba mais": 'default' = cor padrão do tema; 'custom' = cor escolhida */
  buttonColorMode?: 'default' | 'custom';
  buttonColor?: string | null;
  /** Ícone padrão usado nos itens que não têm ícone próprio. Se vazio, usa o ícone padrão da marca. */
  iconImageId?: string | null;
  iconImageUrl?: string | null;
  avifSrc?: string | null;
  iconAlt?: string | null;
};
```

- [ ] **Step 7: `CtaBlockData`** (`:234-251`) — add sibling to `imageUrl`:

```ts
export type CtaBlockData = {
  title?: string | null;
  text?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ctaLinkMode?: 'page' | 'manual' | null;
  ctaPageKey?: string | null;
  ctaPageId?: string | null;
  ctaSlug?: string | null;
  imageId?: string | null;
  imageUrl?: string | null;
  avifSrc?: string | null;
  imageAlt?: string | null;
  /** Lado da imagem no card */
  imageSide?: 'left' | 'right';
  /** Dissolver a imagem no fundo do card (evita corte brusco de tons) */
  imageDissolve?: boolean;
  imageDissolveStrength?: 'soft' | 'medium' | 'strong';
};
```

- [ ] **Step 8: `MediaTextBlockData`** (`:253-265`) — add sibling to `imageUrl`:

```ts
export type MediaTextBlockData = {
  contentHtml: string;
  imageId?: string | null;
  imageUrl?: string | null;
  avifSrc?: string | null;
  imageAlt?: string | null;
  imageSide?: 'left' | 'right';
  imageWidth?: 25 | 50 | 75 | 100;
  imageHeight?: 25 | 50 | 75 | 100;
  customImageWidthPct?: number | null;
  customImageHeightPct?: number | null;
  customImageWidthPx?: number | null;
  customImageHeightPx?: number | null;
};
```

- [ ] **Step 9: Typecheck**

Run: `cd client && npx tsc --noEmit`
Expected: errors only in the renderer/Form files that still reference the old `<img>` shape and haven't been touched yet (Tasks 9-14 fix these) — no errors about the type declarations themselves. If `tsc` reports zero errors at this point, that's fine too (strict optional fields don't force call-site changes).

- [ ] **Step 10: Commit**

```bash
git add client/src/types/blocks.ts
git commit -m "feat(client): add avifSrc to image-bearing block data types"
```

---

### Task 9: `image` block — wire `OptimizedImage`

**Files:**
- Modify: `client/src/blocks/image/renderer.tsx`
- Modify: `client/src/blocks/image/Form.tsx`

**Interfaces:**
- Consumes: `OptimizedImage` (Task 7), `ImageBlockData.avifSrc` (Task 8), `ImagePickerModal`'s `onSelect` `avifSrc` (Task 6).

- [ ] **Step 1: Renderer — swap `<img>` for `<OptimizedImage>`**

In `client/src/blocks/image/renderer.tsx`, add the import and replace the `<img>`:

```tsx
import { getBlockImageCropStyles } from '@/utils/imageCrop';
import { OptimizedImage } from '@/components/OptimizedImage';
import type { BlockRendererProps } from '../_shared/types';
import type { ImageBlockData } from './schema';
```

```tsx
  return (
    <figure className={figureClass}>
      <OptimizedImage src={data.src} avifSrc={data.avifSrc} alt={data.alt ?? ''} loading="lazy" style={cropStyles} />
    </figure>
  );
```

- [ ] **Step 2: Form — thread `avifSrc` when copying from the picker**

In `client/src/blocks/image/Form.tsx`, update `handleSelectImage`'s param type and body:

```ts
  const handleSelectImage = (image: {
    mediaId: string;
    src: string;
    alt: string;
    avifSrc?: string | null;
    width?: number | null;
    height?: number | null;
    cropData?: { x: number; y: number; width: number; height: number; ratio: string }
  }) => {
    onChange({
      ...value,
      mediaId: image.mediaId,
      src: image.src,
      avifSrc: image.avifSrc ?? null,
      alt: image.alt || value.alt,
      caption: value.caption ?? '',
      naturalWidth: image.width ?? value.naturalWidth ?? null,
      naturalHeight: image.height ?? value.naturalHeight ?? null,
      // Salvar crop data no bloco
      cropX: image.cropData?.x,
      cropY: image.cropData?.y,
      cropWidth: image.cropData?.width,
      cropHeight: image.cropData?.height,
      cropRatio: (image.cropData?.ratio as CropRatio | undefined)
    });
  };
```

(`onSelect={handleSelectImage}` already passes the full picker payload object through unchanged — no call-site edit needed here.)

- [ ] **Step 3: Typecheck**

Run: `cd client && npx tsc --noEmit`
Expected: no errors in `blocks/image/*`.

- [ ] **Step 4: Manual smoke check**

Run: `npm run dev` (repo root), open the admin, add/edit an `image` block, select an existing image with a populated `avifUrl` from the library, save, and confirm the public page's `<picture>` now has a `<source type="image/avif">` (inspect via browser devtools).

- [ ] **Step 5: Commit**

```bash
git add client/src/blocks/image/renderer.tsx client/src/blocks/image/Form.tsx
git commit -m "feat(client): serve AVIF variant in the image block"
```

---

### Task 10: `media-text` block — wire `OptimizedImage`

**Files:**
- Modify: `client/src/blocks/media-text/renderer.tsx`
- Modify: `client/src/blocks/media-text/Form.tsx`

**Interfaces:**
- Consumes: `OptimizedImage` (Task 7), `MediaTextBlockData.avifSrc` (Task 8).

- [ ] **Step 1: Renderer**

In `client/src/blocks/media-text/renderer.tsx`:

```tsx
import { RichText } from '@/components/RichText';
import { OptimizedImage } from '@/components/OptimizedImage';
import type { BlockRendererProps } from '../_shared/types';
import type { MediaTextBlockData } from './schema';
```

```tsx
      <figure className="page-media-text-image">
        {data.imageUrl ? (
          <OptimizedImage src={data.imageUrl} avifSrc={data.avifSrc} alt={data.imageAlt ?? ''} loading="lazy" />
        ) : (
          <div className="page-media-text-placeholder">Sem imagem</div>
        )}
      </figure>
```

- [ ] **Step 2: Form — thread `avifSrc` on select, clear it on remove**

In `client/src/blocks/media-text/Form.tsx`, update `handleSelectImage` and its call site:

```ts
  const handleSelectImage = (image: { mediaId: string; src: string; alt: string; avifSrc?: string | null }) => {
    onChange({
      ...value,
      imageId: image.mediaId,
      imageUrl: image.src,
      avifSrc: image.avifSrc ?? null,
      imageAlt: image.alt || value.imageAlt || ''
    });
  };
```

And the `ImagePickerModal` usage at the bottom of the file:

```tsx
      <ImagePickerModal
        open={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelect={(img) => handleSelectImage({ mediaId: img.mediaId, src: img.src, alt: img.alt, avifSrc: img.avifSrc })}
        currentMediaId={value.imageId ?? undefined}
      />
```

There is no explicit "remove image" button in this Form (only "Trocar imagem" which re-opens the picker and goes through `handleSelectImage` again), so no separate clear-path is needed here.

- [ ] **Step 3: Typecheck**

Run: `cd client && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add client/src/blocks/media-text/renderer.tsx client/src/blocks/media-text/Form.tsx
git commit -m "feat(client): serve AVIF variant in the media-text block"
```

---

### Task 11: `cards` block — wire `OptimizedImage`

**Files:**
- Modify: `client/src/blocks/cards/renderer.tsx`
- Modify: `client/src/blocks/cards/Form.tsx`

**Interfaces:**
- Consumes: `OptimizedImage` (Task 7), `CardItem.avifSrc` (Task 8).

- [ ] **Step 1: Renderer**

In `client/src/blocks/cards/renderer.tsx`:

```tsx
import type { CSSProperties } from 'react';
import { OptimizedImage } from '@/components/OptimizedImage';
import type { BlockRendererProps } from '../_shared/types';
import type { CardBlockData } from './schema';
```

```tsx
                {((card.iconType === 'image' || (!card.iconType && card.iconImageUrl)) && card.iconImageUrl) ? (
                  <OptimizedImage
                    className="card-icon-img"
                    src={card.iconImageUrl}
                    avifSrc={card.avifSrc}
                    alt={card.iconAlt ?? ''}
                    loading="lazy"
                  />
                ) : (
```

(Keep the existing emoji-icon `else` branch unchanged.)

- [ ] **Step 2: Form — thread `avifSrc` on select, clear on remove/manual-URL edit**

In `client/src/blocks/cards/Form.tsx`:

```ts
  const handleSelectIconImage = (image: { mediaId: string; src: string; alt: string; avifSrc?: string | null }) => {
    if (!iconTargetId) return;
    handleUpdateCard(iconTargetId, {
      iconType: 'image',
      iconImageUrl: image.src,
      avifSrc: image.avifSrc ?? null,
      iconImageId: image.mediaId,
      iconAlt: image.alt || null
    });
    setIconPickerOpen(false);
    setIconTargetId(null);
  };
```

Update the "Remover" button for a card's image icon:

```tsx
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleUpdateCard(card.id, { iconImageUrl: null, iconImageId: null, avifSrc: null })}
                              >
                                Remover
                              </button>
```

Update the manual URL input, which can no longer be paired with a matching AVIF asset:

```tsx
                        <input
                          value={card.iconImageUrl ?? ''}
                          onChange={(e) =>
                            handleUpdateCard(card.id, {
                              iconImageUrl: e.target.value,
                              iconImageId: null,
                              avifSrc: null
                            })
                          }
                          placeholder="URL da imagem (PNG/WebP)"
                          style={{ width: '100%' }}
                        />
```

And the `ImagePickerModal` call site:

```tsx
      <ImagePickerModal
        open={iconPickerOpen}
        onClose={() => {
          setIconPickerOpen(false);
          setIconTargetId(null);
        }}
        onSelect={(img) => handleSelectIconImage({ mediaId: img.mediaId, src: img.src, alt: img.alt, avifSrc: img.avifSrc })}
        currentMediaId={
          iconTargetId
            ? value.items.find((item) => item.id === iconTargetId)?.iconImageId ?? undefined
            : undefined
        }
      />
```

- [ ] **Step 3: Typecheck**

Run: `cd client && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add client/src/blocks/cards/renderer.tsx client/src/blocks/cards/Form.tsx
git commit -m "feat(client): serve AVIF variant for card icon images"
```

---

### Task 12: `services` block — wire `OptimizedImage`

**Files:**
- Modify: `client/src/blocks/services/renderer.tsx`
- Modify: `client/src/blocks/services/Form.tsx`

**Interfaces:**
- Consumes: `OptimizedImage` (Task 7), `ServicesBlockData.avifSrc` / `ServicesBlockItem.avifSrc` (Task 8).

- [ ] **Step 1: Renderer — mirror the existing icon-source fallback chain for the AVIF source**

`iconSrc` already resolves as `item.iconImageUrl || defaultIconSrc` where `defaultIconSrc = data.iconImageUrl || '/assets/brand/default-icon.svg'`. The matching AVIF source must follow exactly the same branch (per-item icon vs. block-default icon vs. the static SVG, which has no AVIF variant):

```tsx
import type { CSSProperties } from 'react';
import { OptimizedImage } from '@/components/OptimizedImage';
import type { BlockRendererProps } from '../_shared/types';
import type { ServicesBlockData } from './schema';

export function ServicesRenderer({ data }: BlockRendererProps<ServicesBlockData>) {
  const sectionTitle = (data.sectionTitle ?? 'Serviços').toString().trim() || 'Serviços';
  const buttonLabel = (data.buttonLabel ?? 'Saiba mais').toString().trim() || 'Saiba mais';
  const items = Array.isArray(data.items) ? data.items : [];
  const defaultIconSrc = data.iconImageUrl || '/assets/brand/default-icon.svg';
  const defaultIconAvifSrc = data.iconImageUrl ? data.avifSrc : undefined;
  const defaultIconAlt = data.iconAlt || '';

  // Cor do texto (título/descrição dos itens) e do botão: 'default' = cores do tema; 'custom' = cor escolhida.
  const sectionStyle: CSSProperties = {
    ...(data.textColorMode === 'custom' && data.textColor ? { '--services-text-color': data.textColor } : {}),
    ...(data.buttonColorMode === 'custom' && data.buttonColor ? { '--services-button-color': data.buttonColor } : {})
  } as CSSProperties;

  return (
    <div className="services-section" style={sectionStyle}>
      <div className="services-header">
        <h2>{sectionTitle}</h2>
        <span className="services-accent" aria-hidden="true" />
      </div>
      <div className="services-grid">
        {items.map((item) => {
          const iconSrc = item.iconImageUrl || defaultIconSrc;
          const iconAvifSrc = item.iconImageUrl ? item.avifSrc : defaultIconAvifSrc;
          const iconAlt = item.iconAlt || defaultIconAlt;
          return (
            <div key={item.id} className="service-card">
              <div className="service-icon" aria-hidden="true">
                <OptimizedImage src={iconSrc} avifSrc={iconAvifSrc} alt={iconAlt} />
              </div>
              <h3 className="service-card__title">{item.title}</h3>
              {item.description && <p className="service-description">{item.description}</p>}
              <a className="btn btn-outline services-cta" href={item.href || '#'}>{buttonLabel}</a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Form — thread `avifSrc` for both the block-default icon and per-item icons; clear on remove**

In `client/src/blocks/services/Form.tsx`:

```ts
  const handleSelectIcon = (image: { mediaId: string; src: string; alt: string; avifSrc?: string | null }) => {
    if (iconPickerTarget === 'default') {
      onChange({
        ...value,
        iconImageId: image.mediaId,
        iconImageUrl: image.src,
        avifSrc: image.avifSrc ?? null,
        iconAlt: image.alt || null
      });
    } else if (iconPickerTarget) {
      handleUpdateItem(iconPickerTarget, {
        iconImageId: image.mediaId,
        iconImageUrl: image.src,
        avifSrc: image.avifSrc ?? null,
        iconAlt: image.alt || null
      });
    }
    setIconPickerTarget(null);
  };

  const handleRemoveIcon = () => {
    onChange({ ...value, iconImageId: null, iconImageUrl: null, avifSrc: null, iconAlt: null });
  };

  const handleRemoveItemIcon = (id: string) => {
    handleUpdateItem(id, { iconImageId: null, iconImageUrl: null, avifSrc: null, iconAlt: null });
  };
```

`onSelect={handleSelectIcon}` (bottom of the file) is passed by reference and already receives the full picker payload — no call-site edit needed.

- [ ] **Step 3: Typecheck**

Run: `cd client && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add client/src/blocks/services/renderer.tsx client/src/blocks/services/Form.tsx
git commit -m "feat(client): serve AVIF variant in the services block"
```

---

### Task 13: `cta` block — wire `OptimizedImage`

**Files:**
- Modify: `client/src/blocks/cta/renderer.tsx`
- Modify: `client/src/blocks/cta/Form.tsx`

**Interfaces:**
- Consumes: `OptimizedImage` (Task 7), `CtaBlockData.avifSrc` (Task 8).

- [ ] **Step 1: Renderer**

In `client/src/blocks/cta/renderer.tsx`:

```tsx
import { OptimizedImage } from '@/components/OptimizedImage';
import type { BlockRendererProps } from '../_shared/types';
import type { CtaBlockData } from './schema';
```

```tsx
      {imageUrl && (
        <div className="cta-media" aria-hidden="true">
          <OptimizedImage src={imageUrl} avifSrc={data.avifSrc} alt={imageAlt} loading="lazy" />
        </div>
      )}
```

- [ ] **Step 2: Form — thread `avifSrc` on select, clear on remove/manual-URL edit**

In `client/src/blocks/cta/Form.tsx`:

```ts
  const handleSelectImage = (image: { mediaId: string; src: string; alt: string; avifSrc?: string | null }) => {
    onChange({
      ...value,
      imageId: image.mediaId,
      imageUrl: image.src,
      avifSrc: image.avifSrc ?? null,
      imageAlt: image.alt || value.imageAlt || ''
    });
  };

  const handleRemoveImage = () => {
    onChange({
      ...value,
      imageId: null,
      imageUrl: null,
      avifSrc: null
    });
  };
```

Update the manual URL input:

```tsx
        <div className="editor-field">
          <label>URL da imagem (opcional)</label>
          <input
            value={value.imageUrl ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                imageUrl: e.target.value,
                imageId: null,
                avifSrc: null
              })
            }
            placeholder="https://..."
          />
        </div>
```

And the `ImagePickerModal` call site:

```tsx
      <ImagePickerModal
        open={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelect={(img) => handleSelectImage({ mediaId: img.mediaId, src: img.src, alt: img.alt, avifSrc: img.avifSrc })}
        currentMediaId={value.imageId ?? undefined}
      />
```

- [ ] **Step 3: Typecheck**

Run: `cd client && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add client/src/blocks/cta/renderer.tsx client/src/blocks/cta/Form.tsx
git commit -m "feat(client): serve AVIF variant in the cta block"
```

---

### Task 14: `hero` block (V1 + V2) — wire `OptimizedImage`

**Files:**
- Modify: `client/src/blocks/hero/renderer.tsx`
- Modify: `client/src/blocks/hero/Form.tsx`

**Interfaces:**
- Consumes: `OptimizedImage` (Task 7), `ImageBlockData.avifSrc` (already flows for V2 since it nests a real `image` block — Task 9), `HeroImage.avifSrc` / `HeroCard.avifSrc` (Task 8).

- [ ] **Step 1: Renderer — V2 (`renderHeroImage`)**

In `client/src/blocks/hero/renderer.tsx`, add the import and update `renderHeroImage`'s image branch:

```tsx
import type { CSSProperties } from 'react';
import { getBlockImageCropStylesNoTransform } from '@/utils/imageCrop';
import { OptimizedImage } from '@/components/OptimizedImage';
import type { ImageBlockData, HeroBlockDataV2, HeroImageHeight, PageBlock } from '@/types';
import type { BlockRendererProps } from '../_shared/types';
import type { HeroBlockData } from './schema';
```

```tsx
      return (
        <div
          key={childBlock.id}
          className={`hero-media ${variant === 'stacked' ? 'hero-media--stacked' : ''}`.trim()}
          style={{ '--hero-media-height': heroImageHeight } as CSSProperties}
        >
          {imgData.src ? (
            <OptimizedImage
              src={imgData.src}
              avifSrc={imgData.avifSrc}
              alt={imgData.alt || ''}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                objectFit: 'cover',
                ...cropStyles
              }}
            />
          ) : (
            <div className="hero-media-placeholder">Sem imagem</div>
          )}
        </div>
      );
```

- [ ] **Step 2: Renderer — V1 `readHeroCard` helper reads `avifSrc` too**

```tsx
  const readHeroCard = (raw: unknown, defaults: { title: string; text: string }) => {
    const c = (raw as Record<string, unknown>) || {};
    return {
      title: typeof c.title === 'string' ? c.title : defaults.title,
      text: typeof c.text === 'string' ? c.text : defaults.text,
      icon: typeof c.icon === 'string' ? c.icon : undefined,
      url: typeof c.url === 'string' ? c.url : undefined,
      alt: typeof c.alt === 'string' ? c.alt : undefined,
      avifSrc: typeof c.avifSrc === 'string' ? c.avifSrc : undefined
    };
  };
```

- [ ] **Step 3: Renderer — V1 `renderSingleImage`**

```tsx
  const renderSingleImage = () => {
    // V1 hero: sem schema tipado, dado bruto de páginas legadas
    const image = (dataV1.singleImage as Record<string, unknown>) || {};
    const url = typeof image.url === 'string' ? image.url : '';
    const alt = typeof image.alt === 'string' ? image.alt : '';
    const avifSrc = typeof image.avifSrc === 'string' ? image.avifSrc : undefined;
    if (!url) {
      return <div className="hero-image-placeholder">Sem imagem</div>;
    }
    return (
      <div className="hero-single-image-frame">
        <OptimizedImage className="hero-single-image" src={url} avifSrc={avifSrc} alt={alt} />
      </div>
    );
  };
```

- [ ] **Step 4: Renderer — V1 `renderFourCards` (medium + small)**

```tsx
    return (
      <div className="hero-cards-grid">
        <div className="hero-card hero-card-medium">
          {medium.icon && <div className="hero-card-icon">{medium.icon}</div>}
          {medium.url && <OptimizedImage className="hero-card-image" src={medium.url} avifSrc={medium.avifSrc} alt={medium.alt ?? ''} />}
          <p>{medium.title}</p>
          <strong>{medium.text}</strong>
        </div>
        <div className="hero-small-cards">
          {small.map((card, idx) => (
            <div key={idx} className="hero-card hero-card-small">
              {card.icon && <div className="hero-card-icon">{card.icon}</div>}
              {card.url && <OptimizedImage className="hero-card-image" src={card.url} avifSrc={card.avifSrc} alt={card.alt ?? ''} />}
              <strong>{card.title}</strong>
              <p>{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
```

(`renderCardsOnly` renders no images — leave it untouched.)

- [ ] **Step 5: Form — thread `avifSrc` through `handleSelectImage` for all three V1 targets**

In `client/src/blocks/hero/Form.tsx`:

```ts
  const handleSelectImage = (image: { mediaId: string; src: string; alt: string; avifSrc?: string | null }) => {
    if (!imageTarget) return;
    if (imageTarget.type === 'singleImage') {
      onChange({
        ...value,
        singleImage: { imageId: image.mediaId, url: image.src, avifSrc: image.avifSrc ?? null, alt: image.alt }
      });
    } else if (imageTarget.type === 'medium') {
      onChange({
        ...value,
        fourCards: {
          ...fourCards,
          medium: { ...fourCards.medium, imageId: image.mediaId, url: image.src, avifSrc: image.avifSrc ?? null, alt: image.alt }
        }
      });
    } else if (imageTarget.type === 'small') {
      const next = ensureSmall();
      if (imageTarget.index !== undefined) {
        next[imageTarget.index] = {
          ...next[imageTarget.index],
          imageId: image.mediaId,
          url: image.src,
          avifSrc: image.avifSrc ?? null,
          alt: image.alt
        };
      }
      onChange({
        ...value,
        fourCards: {
          ...fourCards,
          small: next
        }
      });
    }
    setImagePickerOpen(false);
    setImageTarget(null);
  };
```

- [ ] **Step 6: Form — clear `avifSrc` when a card image is removed**

In `renderCardEditor`'s "Remover imagem" button:

```tsx
            {card.url && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onUpdate({ ...card, url: null, imageId: null, avifSrc: null, alt: null })}>
                Remover imagem
              </button>
            )}
```

(The single-image "Remover" button already nulls the whole `singleImage` object — `onClick={() => onChange({ ...value, singleImage: null })}` — no change needed there.)

- [ ] **Step 7: Form — thread `avifSrc` at the `ImagePickerModal` call site**

```tsx
      <ImagePickerModal
        open={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelect={(img) => handleSelectImage({ mediaId: img.mediaId, src: img.src, alt: img.alt, avifSrc: img.avifSrc })}
        currentMediaId={
          imageTarget?.type === 'singleImage'
            ? value.singleImage?.imageId ?? undefined
            : imageTarget?.type === 'medium'
              ? fourCards.medium.imageId ?? undefined
              : imageTarget?.type === 'small' && imageTarget.index !== undefined
                ? ensureSmall()[imageTarget.index].imageId ?? undefined
                : undefined
        }
      />
```

- [ ] **Step 8: Typecheck**

Run: `cd client && npx tsc --noEmit`
Expected: no errors anywhere in the client.

- [ ] **Step 9: Full test suite (both sides)**

Run: `cd server && npm run test` then `cd client && npm run test`
Expected: all tests pass, including the new `SupabaseStorageProvider.test.ts`, `media.service.test.ts`, and `OptimizedImage.test.tsx`.

- [ ] **Step 10: Manual smoke check**

Run `npm run dev` from the repo root. Upload a fresh image via the media library, wait a few seconds, reopen the library (confirms `avifUrl` populated), insert that image into a `hero` block (both a V1 single-image hero and a V2 split hero) and a `cta` block, then inspect the rendered public page's DOM to confirm `<picture><source type="image/avif" srcset=".../*.avif">` is present pointing at a real, loadable `.avif` file.

- [ ] **Step 11: Commit**

```bash
git add client/src/blocks/hero/renderer.tsx client/src/blocks/hero/Form.tsx
git commit -m "feat(client): serve AVIF variant in the hero block (V1 and V2)"
```

---

## Post-plan checklist (self-review against the spec)

- Decision 1 (async, no queue, no retry): Task 3 — `generateAvifVariant` is never awaited by `upload`/`update`, all errors caught and logged.
- Decision 2 (no backfill): no task touches existing rows; only rows created/updated after this ships ever get `avifUrl`.
- Decision 3 (6 blocks, `BackgroundPicker` out of scope): Tasks 9–14 cover exactly `image`, `media-text`, `cards`, `services`, `cta`, `hero` (V1+V2) = 9 `<img>`/`<OptimizedImage>` call sites; `BackgroundPicker.tsx` is never opened for edit.
- Decision 4 (no AVIF for GIF): Task 3's `generateAvifVariant` returns early on `mimeType === 'image/gif'`, tested explicitly.
- Bucket allowlist: Task 2 Step 5 adds `image/avif`, otherwise the real Supabase upload in Task 3's fire-and-forget path would fail silently in production even though the mocked test suite passes.
- Error handling section: P2025 swallow tested in Task 3; encode/upload failures logged and swallowed (same code path, generic catch); GIF skip tested.
- Tests section: `SupabaseStorageProvider.uploadAvifVariant` unit test (Task 2), `MediaService.upload`/`update` fire-and-forget test (Task 3), `OptimizedImage` render test (Task 7) — using `renderToString` instead of React Testing Library since the latter isn't a client dependency in this repo.
