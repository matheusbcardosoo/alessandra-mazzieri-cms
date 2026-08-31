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

// media.service.ts imports the real logger, which constructs a pino()
// instance from `env` at module load time. The env mock above only
// provides the fields media.service.ts itself reads, so LOG_LEVEL is
// undefined — pino throws on construction unless the logger is mocked too.
vi.mock('../config/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

const mockAuditLog = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock('./auditLog.service', () => ({ auditLogService: mockAuditLog }));

import { MediaService } from './media.service';

const actor = { id: 'user-1', name: 'Ana', email: 'ana@example.com' };

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

      const result = await service.upload(makeFile(), undefined, actor);

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

      await expect(service.upload(makeFile(), undefined, actor)).resolves.toMatchObject({ id: 'media-1' });

      await flush();
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('skips AVIF generation entirely for GIF uploads', async () => {
      await service.upload(makeFile({ mimetype: 'image/gif' }), undefined, actor);
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

      await service.upload(makeFile(), undefined, actor);
      await flush();

      expect(mockRepo.update).toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    beforeEach(() => {
      mockRepo.findById.mockResolvedValue({ id: 'media-1', path: 'images/2026/08/old.webp' });
      mockRepo.update.mockResolvedValue({ id: 'media-1', path: 'images/2026/08/old.webp' });
    });

    it('resolves before the background AVIF job settles when a new file is uploaded', async () => {
      let resolveAvif!: (value: { url: string; path: string; size: number }) => void;
      mockStorageProvider.uploadAvifVariant.mockReturnValue(
        new Promise((resolve) => {
          resolveAvif = resolve;
        })
      );

      await service.update('media-1', makeFile(), undefined, actor);
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

    it('clears the stale AVIF pointer and deletes the old AVIF object when the file is replaced', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'media-1',
        path: 'images/2026/08/old.webp',
        avifPath: 'images/2026/08/old.avif'
      });
      mockStorageProvider.uploadAvifVariant.mockReturnValue(new Promise(() => {}));

      await service.update('media-1', makeFile(), undefined, actor);

      expect(mockRepo.update).toHaveBeenCalledWith(
        'media-1',
        expect.objectContaining({ avifUrl: null, avifPath: null, avifSize: null })
      );
      expect(mockStorageProvider.delete).toHaveBeenCalledWith('images/2026/08/old.webp');
      expect(mockStorageProvider.delete).toHaveBeenCalledWith('images/2026/08/old.avif');
    });

    it('does not trigger an AVIF job when only metadata changes (no file)', async () => {
      await service.update('media-1', undefined, { alt: 'novo alt' }, actor);
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

      await service.delete('media-1', actor);

      expect(mockStorageProvider.delete).toHaveBeenCalledWith('images/2026/08/id-photo.webp');
      expect(mockStorageProvider.delete).toHaveBeenCalledWith('images/2026/08/id-photo.avif');
    });

    it('does not try to remove an AVIF variant when none was generated', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'media-1',
        path: 'images/2026/08/id-photo.webp',
        avifPath: null
      });

      await service.delete('media-1', actor);

      expect(mockStorageProvider.delete).toHaveBeenCalledTimes(1);
      expect(mockStorageProvider.delete).toHaveBeenCalledWith('images/2026/08/id-photo.webp');
    });
  });

  describe('audit log', () => {
    it('records an upload entry using the original filename as label', async () => {
      await service.upload(makeFile({ originalname: 'foto-equipe.png' }), undefined, actor);

      expect(mockAuditLog.record).toHaveBeenCalledWith({
        actor,
        action: 'upload',
        entity: 'media',
        entityId: 'media-1',
        entityLabel: 'foto-equipe.png'
      });
    });

    it('records an update entry', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'media-1', path: 'images/2026/08/old.webp', title: 'Antiga' });
      mockRepo.update.mockResolvedValue({ id: 'media-1', title: 'Nova', alt: null, path: 'images/2026/08/old.webp' });

      await service.update('media-1', undefined, { title: 'Nova' }, actor);

      expect(mockAuditLog.record).toHaveBeenCalledWith({
        actor,
        action: 'update',
        entity: 'media',
        entityId: 'media-1',
        entityLabel: 'Nova'
      });
    });

    it('records an update entry for a crop save', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'media-1', path: 'images/2026/08/old.webp', title: 'Foto' });
      mockRepo.update.mockResolvedValue({ id: 'media-1', title: 'Foto', path: 'images/2026/08/old.webp' });

      await service.saveCrop('media-1', { cropX: 0, cropY: 0, cropWidth: 100, cropHeight: 100 }, actor);

      expect(mockAuditLog.record).toHaveBeenCalledWith({
        actor,
        action: 'update',
        entity: 'media',
        entityId: 'media-1',
        entityLabel: 'Foto'
      });
    });

    it('records a delete entry using the label captured before deletion', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'media-1', path: 'images/2026/08/id-photo.webp', title: 'Foto antiga', avifPath: null });

      await service.delete('media-1', actor);

      expect(mockAuditLog.record).toHaveBeenCalledWith({
        actor,
        action: 'delete',
        entity: 'media',
        entityId: 'media-1',
        entityLabel: 'Foto antiga'
      });
    });
  });
});
