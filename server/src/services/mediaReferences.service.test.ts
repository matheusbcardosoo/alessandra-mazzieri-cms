import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { PageBlock, PageLayoutV2 } from '../utils/pageLayout';

vi.mock('../config/prisma', () => ({
  prisma: { media: { findMany: vi.fn() } }
}));

import { prisma } from '../config/prisma';
import { collectMediaRefs, findMissingMedia } from './mediaReferences.service';

function layoutWithBlocks(blocks: PageBlock[]): PageLayoutV2 {
  return {
    version: 2,
    sections: [{ id: 's1', columns: 1, cols: [{ id: 'col-1', blocks }], settings: {} }]
  };
}

const now = '2026-08-30T12:00:00.000Z';

describe('collectMediaRefs', () => {
  it('collects mediaId from an image block', () => {
    const block: PageBlock = {
      id: 'b1',
      type: 'image',
      createdAt: now,
      updatedAt: now,
      data: { mediaId: 'm1', src: 'https://x/img.webp', size: 100, align: 'center' }
    };
    expect(collectMediaRefs(layoutWithBlocks([block]))).toEqual([{ blockId: 'b1', mediaId: 'm1' }]);
  });

  it('ignores an image block without a mediaId', () => {
    const block: PageBlock = {
      id: 'b1',
      type: 'image',
      createdAt: now,
      updatedAt: now,
      data: { mediaId: null, src: 'https://x/img.webp', size: 100, align: 'center' }
    };
    expect(collectMediaRefs(layoutWithBlocks([block]))).toEqual([]);
  });

  it('collects imageId from Hero V1 singleImage and fourCards', () => {
    const block: PageBlock = {
      id: 'hero1',
      type: 'hero',
      createdAt: now,
      updatedAt: now,
      isLocked: true,
      data: {
        singleImage: { imageId: 'm-single', url: 'https://x/a.webp', alt: '', focal: null },
        fourCards: {
          medium: { title: 't', text: 't', icon: null, imageId: 'm-medium', url: null, alt: null },
          small: [
            { title: 't', text: 't', icon: null, imageId: 'm-small-1', url: null, alt: null },
            { title: 't', text: 't', icon: null, imageId: null, url: null, alt: null },
            { title: 't', text: 't', icon: null, imageId: 'm-small-3', url: null, alt: null }
          ]
        }
      }
    };
    const refs = collectMediaRefs(layoutWithBlocks([block]));
    expect(refs).toEqual([
      { blockId: 'hero1', mediaId: 'm-single' },
      { blockId: 'hero1', mediaId: 'm-medium' },
      { blockId: 'hero1', mediaId: 'm-small-1' },
      { blockId: 'hero1', mediaId: 'm-small-3' }
    ]);
  });

  it('collects mediaId from a Hero V2 nested right-column image block, attributed to the Hero id', () => {
    const nestedImage: PageBlock = {
      id: 'nested-image',
      type: 'image',
      createdAt: now,
      updatedAt: now,
      data: { mediaId: 'm-nested', src: 'https://x/right.webp', size: 100, align: 'center' }
    };
    const heroBlock: PageBlock = {
      id: 'hero2',
      type: 'hero',
      createdAt: now,
      updatedAt: now,
      isLocked: true,
      data: {
        version: 2,
        layout: 'two-col',
        left: [],
        right: [nestedImage],
        rightVariant: 'image-only'
      }
    };
    const refs = collectMediaRefs(layoutWithBlocks([heroBlock]));
    expect(refs).toEqual([{ blockId: 'hero2', mediaId: 'm-nested' }]);
  });

  it('collects iconImageId from cards items with iconType "image", ignoring emoji icons', () => {
    const block: PageBlock = {
      id: 'cards1',
      type: 'cards',
      createdAt: now,
      updatedAt: now,
      data: {
        items: [
          { id: 'i1', title: 'A', text: 'a', iconType: 'image', iconImageId: 'm-icon-1' },
          { id: 'i2', title: 'B', text: 'b', iconType: 'emoji', icon: '🌿', iconImageId: null }
        ],
        layout: 'auto',
        variant: 'feature'
      }
    };
    expect(collectMediaRefs(layoutWithBlocks([block]))).toEqual([{ blockId: 'cards1', mediaId: 'm-icon-1' }]);
  });

  it('collects imageId from cta and media-text blocks', () => {
    const ctaBlock: PageBlock = {
      id: 'cta1',
      type: 'cta',
      createdAt: now,
      updatedAt: now,
      data: { imageId: 'm-cta' }
    };
    const mediaTextBlock: PageBlock = {
      id: 'mt1',
      type: 'media-text',
      createdAt: now,
      updatedAt: now,
      data: { contentHtml: '<p>x</p>', imageId: 'm-mt' }
    };
    expect(collectMediaRefs(layoutWithBlocks([ctaBlock, mediaTextBlock]))).toEqual([
      { blockId: 'cta1', mediaId: 'm-cta' },
      { blockId: 'mt1', mediaId: 'm-mt' }
    ]);
  });

  it('collects iconImageId from services top-level and from each item', () => {
    const block: PageBlock = {
      id: 'svc1',
      type: 'services',
      createdAt: now,
      updatedAt: now,
      data: {
        sectionTitle: 'Serviços',
        iconImageId: 'm-svc-top',
        items: [
          { id: 'i1', title: 'A', href: '/a', iconImageId: 'm-svc-item-1' },
          { id: 'i2', title: 'B', href: '/b', iconImageId: null }
        ]
      }
    };
    expect(collectMediaRefs(layoutWithBlocks([block]))).toEqual([
      { blockId: 'svc1', mediaId: 'm-svc-top' },
      { blockId: 'svc1', mediaId: 'm-svc-item-1' }
    ]);
  });

  it('returns an empty array for a layout with no sections', () => {
    expect(collectMediaRefs({ version: 2, sections: [] })).toEqual([]);
  });
});

describe('findMissingMedia', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not query the database when the layout has no media references', async () => {
    const layout = layoutWithBlocks([]);
    const result = await findMissingMedia(layout);
    expect(result).toEqual([]);
    expect(prisma.media.findMany).not.toHaveBeenCalled();
  });

  it('queries with deduplicated ids and returns only the refs not found', async () => {
    const blockA: PageBlock = {
      id: 'a',
      type: 'image',
      createdAt: now,
      updatedAt: now,
      data: { mediaId: 'm1', src: 'https://x/a.webp', size: 100, align: 'center' }
    };
    const blockB: PageBlock = {
      id: 'b',
      type: 'image',
      createdAt: now,
      updatedAt: now,
      data: { mediaId: 'm1', src: 'https://x/a.webp', size: 100, align: 'center' }
    };
    const blockC: PageBlock = {
      id: 'c',
      type: 'cta',
      createdAt: now,
      updatedAt: now,
      data: { imageId: 'm2' }
    };
    vi.mocked(prisma.media.findMany).mockResolvedValue(
      [{ id: 'm1' }] as unknown as Awaited<ReturnType<typeof prisma.media.findMany>>
    );

    const result = await findMissingMedia(layoutWithBlocks([blockA, blockB, blockC]));

    expect(prisma.media.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['m1', 'm2'] } },
      select: { id: true }
    });
    expect(result).toEqual([{ blockId: 'c', mediaId: 'm2' }]);
  });
});
