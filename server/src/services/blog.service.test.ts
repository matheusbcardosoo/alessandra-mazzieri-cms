import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Prisma } from '@prisma/client';

type FakePage = {
  id: string;
  slug: string;
  pageKey: string | null;
  title: string;
  description: string | null;
  layout: unknown;
  status: 'draft' | 'published';
  publishedAt: Date | null;
};

// `mockRepo` must be created via `vi.hoisted` (not a plain top-level `const`)
// because vitest hoists `vi.mock` factories — and the `import { BlogService }`
// that triggers `new PageRepository()` at blog.service.ts's module-evaluation
// time — above ordinary statements per ESM semantics. A plain `const mockRepo`
// declared later in this file would still be in its temporal dead zone when
// the mocked `PageRepository` constructor runs.
const mockRepo = vi.hoisted(() => ({
  findBySlugOrKey: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn()
}));

vi.mock('../repositories/page.repository', () => ({
  // vitest 4 requires a real `function`/`class` implementation for a mock
  // that gets invoked with `new` — an arrow function throws "is not a
  // constructor".
  PageRepository: vi.fn().mockImplementation(function PageRepository() {
    return mockRepo;
  })
}));

const cacheStore = new Map<string, unknown>();

vi.mock('../config/cache', () => ({
  cacheProvider: {
    get: vi.fn(async (key: string) => cacheStore.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      cacheStore.set(key, value);
    }),
    del: vi.fn(async (key: string | string[]) => {
      (Array.isArray(key) ? key : [key]).forEach((k) => cacheStore.delete(k));
    }),
    wrap: vi.fn(async (key: string, _ttl: number, fn: () => Promise<unknown>) => {
      if (cacheStore.has(key)) return cacheStore.get(key);
      const value = await fn();
      cacheStore.set(key, value);
      return value;
    })
  },
  cacheKeys: { blog: 'blog:public' },
  cacheTTL: { blog: 3600 }
}));

import { BlogService } from './blog.service';

function makePage(overrides: Partial<FakePage> = {}): FakePage {
  return {
    id: 'blog-id',
    slug: 'blog',
    pageKey: 'blog',
    title: 'Jornadas e reflexões',
    description: 'Leituras rápidas, aplicáveis e cuidadosas.',
    layout: { version: 1, sections: [] },
    status: 'published',
    publishedAt: new Date('2026-01-01'),
    ...overrides
  };
}

describe('BlogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheStore.clear();
  });

  it('creates the reserved blog page with the 3 default sections on first access', async () => {
    mockRepo.findBySlugOrKey.mockResolvedValue(null);
    mockRepo.create.mockImplementation(async (data: Prisma.PageCreateInput) => makePage({ layout: data.layout }));

    const service = new BlogService();
    const config = await service.getAdmin();

    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'blog', pageKey: 'blog' }));
    expect(config.sections.map((s) => s.type)).toEqual(['featured', 'mostViewed', 'allArticles']);
    expect(config.sections.every((s) => s.visible)).toBe(true);
  });

  it('reuses the existing blog page without creating a new one', async () => {
    mockRepo.findBySlugOrKey.mockResolvedValue(makePage());

    const service = new BlogService();
    await service.getAdmin();

    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('rejects updates for an id that is not the reserved blog page', async () => {
    mockRepo.findById.mockResolvedValue(makePage({ pageKey: null, slug: 'sobre' }));

    const service = new BlogService();
    await expect(service.updateBlog('other-id', { title: 'x' })).rejects.toMatchObject({ status: 404 });
  });

  it('updates title, description and sections, and republishes the cache', async () => {
    const existing = makePage();
    mockRepo.findById.mockResolvedValue(existing);
    mockRepo.update.mockImplementation(async (_id: string, data: Prisma.PageUpdateInput) => ({ ...existing, ...data }));

    const service = new BlogService();
    const result = await service.updateBlog('blog-id', {
      title: 'Novo título',
      description: 'Nova descrição',
      sections: [{ type: 'mostViewed', visible: false, title: '', subtitle: '' }]
    });

    expect(result.title).toBe('Novo título');
    expect(result.description).toBe('Nova descrição');
    expect(result.sections).toEqual([
      { type: 'mostViewed', visible: false, title: 'Mais vistos', subtitle: 'O que as leitoras estão consumindo agora.' }
    ]);

    const cached = await service.getPublic();
    expect(cached.title).toBe('Novo título');
  });
});
