import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('sharp');

import sharp from 'sharp';
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
  let mockToBuffer: ReturnType<typeof vi.fn>;
  let mockAvif: ReturnType<typeof vi.fn>;
  let mockResize: ReturnType<typeof vi.fn>;
  let mockRotate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockToBuffer = vi.fn();
    mockAvif = vi.fn(() => ({ toBuffer: mockToBuffer }));
    mockResize = vi.fn(() => ({ avif: mockAvif }));
    mockRotate = vi.fn(() => ({ resize: mockResize }));

    vi.mocked(sharp).mockImplementation(() => ({
      rotate: mockRotate
    } as unknown as ReturnType<typeof sharp>));
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
