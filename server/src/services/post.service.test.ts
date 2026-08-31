import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PostStatus } from '@prisma/client';

const mockRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  countFeaturedPublished: vi.fn().mockResolvedValue(0),
  listFeatured: vi.fn().mockResolvedValue([]),
  listMostViewed: vi.fn().mockResolvedValue([]),
  paginatePublished: vi.fn().mockResolvedValue({ items: [], total: 0 })
}));

vi.mock('../repositories/post.repository', () => ({
  PostRepository: vi.fn().mockImplementation(function PostRepository() {
    return mockRepo;
  })
}));

vi.mock('../config/cache', () => ({
  cacheProvider: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    delPrefix: vi.fn(),
    wrap: vi.fn((_key, _ttl, fn) => fn())
  },
  cacheKeys: {
    post: (slug: string) => `post:${slug}`,
    postsList: 'posts:list',
    postsFeatured: 'posts:featured',
    postsMostViewed: 'posts:most-viewed',
    blogHome: 'posts:blog-home'
  },
  cacheTTL: { post: 3600, postsList: 3600, featuredPosts: 3600, mostViewedPosts: 3600, blogHome: 120 }
}));

vi.mock('./seo.service', () => ({
  SeoService: vi.fn().mockImplementation(function SeoService() {
    return { regeneratePublicIndexes: vi.fn() };
  })
}));

vi.mock('../utils/sanitize', () => ({ sanitizeContent: (v: string) => v }));

const mockAuditLog = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock('./auditLog.service', () => ({ auditLogService: mockAuditLog }));

import { PostService } from './post.service';

const actor = { id: 'user-1', name: 'Ana', email: 'ana@example.com' };
const basePayload = { title: 'Artigo', slug: 'artigo', excerpt: 'Resumo', content: 'Conteúdo' };

describe('PostService audit log', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records a create entry', async () => {
    mockRepo.create.mockResolvedValue({ id: 'post-1', title: 'Artigo', status: PostStatus.draft, slug: 'artigo' });

    const service = new PostService();
    await service.create(basePayload, actor);

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'create',
      entity: 'post',
      entityId: 'post-1',
      entityLabel: 'Artigo'
    });
  });

  it('records an update entry', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'post-1', title: 'Artigo', status: PostStatus.draft, slug: 'artigo', isFeatured: false });
    mockRepo.update.mockResolvedValue({ id: 'post-1', title: 'Artigo novo', status: PostStatus.draft, slug: 'artigo' });

    const service = new PostService();
    await service.update('post-1', { title: 'Artigo novo' }, actor);

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'update',
      entity: 'post',
      entityId: 'post-1',
      entityLabel: 'Artigo novo'
    });
  });

  it('records a publish entry', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'post-1', title: 'Artigo', status: PostStatus.draft, slug: 'artigo', isFeatured: false });
    mockRepo.update.mockResolvedValue({ id: 'post-1', title: 'Artigo', status: PostStatus.published, slug: 'artigo' });

    const service = new PostService();
    await service.publish('post-1', actor);

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'publish',
      entity: 'post',
      entityId: 'post-1',
      entityLabel: 'Artigo'
    });
  });

  it('records an unpublish entry', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'post-1', title: 'Artigo', status: PostStatus.published, slug: 'artigo', isFeatured: false });
    mockRepo.update.mockResolvedValue({ id: 'post-1', title: 'Artigo', status: PostStatus.draft, slug: 'artigo' });

    const service = new PostService();
    await service.unpublish('post-1', actor);

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'unpublish',
      entity: 'post',
      entityId: 'post-1',
      entityLabel: 'Artigo'
    });
  });

  it('records a delete entry using the label captured before deletion', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'post-1', title: 'Artigo', status: PostStatus.draft, slug: 'artigo', isFeatured: false });

    const service = new PostService();
    await service.delete('post-1', actor);

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'delete',
      entity: 'post',
      entityId: 'post-1',
      entityLabel: 'Artigo'
    });
  });
});
