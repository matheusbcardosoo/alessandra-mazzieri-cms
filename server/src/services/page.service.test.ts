import { describe, expect, it, vi, beforeEach } from 'vitest';

// `mockRepo` must be created via `vi.hoisted` (not a plain top-level `const`)
// because vitest hoists `vi.mock` factories above ordinary statements per ESM
// semantics — see the same pattern/comment in blog.service.test.ts.
const mockRepo = vi.hoisted(() => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
}));

vi.mock('../repositories/page.repository', () => ({
  // vitest 4 requires a real `function`/`class` implementation for a mock
  // that gets invoked with `new` — an arrow function throws "is not a
  // constructor".
  PageRepository: vi.fn().mockImplementation(function PageRepository() {
    return mockRepo;
  })
}));

vi.mock('../config/cache', () => ({
  cacheProvider: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    wrap: vi.fn()
  },
  cacheKeys: { page: (slug: string) => `page:${slug}` },
  cacheTTL: { page: 3600 }
}));

vi.mock('./seo.service', () => ({
  SeoService: vi.fn().mockImplementation(function SeoService() {
    return { regeneratePublicIndexes: vi.fn() };
  })
}));

const mockAuditLog = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock('./auditLog.service', () => ({ auditLogService: mockAuditLog }));

const mockPageVersionService = vi.hoisted(() => ({ snapshot: vi.fn() }));
vi.mock('./pageVersion.service', () => ({ pageVersionService: mockPageVersionService }));

import { PageService } from './page.service';

const actor = { id: 'user-1', name: 'Ana', email: 'ana@example.com' };

describe('PageService.listAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('excludes both reserved pages (home, blog) by default', async () => {
    mockRepo.findAll.mockResolvedValue([]);
    const service = new PageService();

    await service.listAdmin(false, undefined);

    expect(mockRepo.findAll).toHaveBeenCalledWith({
      excludePageKeys: ['home', 'blog'],
      excludeSlugs: ['home', 'blog']
    });
  });

  it('includes the home page but still excludes blog when includeHome=true', async () => {
    const home = { id: 'home-1', pageKey: 'home', slug: 'home', title: 'Início' };
    const other = { id: 'p1', pageKey: null, slug: 'sobre', title: 'Sobre' };
    mockRepo.findAll.mockResolvedValue([home, other]);
    const service = new PageService();

    const result = await service.listAdmin(true, undefined);

    expect(mockRepo.findAll).toHaveBeenCalledWith({ excludePageKeys: ['blog'], excludeSlugs: ['blog'] });
    expect(result).toEqual([home, other]);
  });

  it('filters the result to restrictToIds when provided', async () => {
    mockRepo.findAll.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]);
    const service = new PageService();

    const result = await service.listAdmin(false, ['p2']);

    expect(result).toEqual([{ id: 'p2' }]);
  });
});

describe('PageService audit log', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records a create entry with the created page as label', async () => {
    mockRepo.create.mockResolvedValue({ id: 'p1', slug: 'sobre', title: 'Sobre', status: 'draft' });
    const service = new PageService();

    await service.create({ slug: 'sobre', title: 'Sobre', layout: { version: 2, sections: [] } }, actor);

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'create',
      entity: 'page',
      entityId: 'p1',
      entityLabel: 'Sobre'
    });
  });

  it('records an update entry with the updated page as label', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'p1', slug: 'sobre', title: 'Sobre', status: 'draft', pageKey: null });
    mockRepo.update.mockResolvedValue({ id: 'p1', slug: 'sobre', title: 'Sobre novo', status: 'draft' });
    const service = new PageService();

    await service.update('p1', { title: 'Sobre novo' }, actor);

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'update',
      entity: 'page',
      entityId: 'p1',
      entityLabel: 'Sobre novo'
    });
  });

  it('records a publish entry', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'p1', slug: 'sobre', title: 'Sobre', status: 'draft', pageKey: null });
    mockRepo.update.mockResolvedValue({ id: 'p1', slug: 'sobre', title: 'Sobre', status: 'published' });
    const service = new PageService();

    await service.publish('p1', actor);

    expect(mockPageVersionService.snapshot).toHaveBeenCalledWith(
      { id: 'p1', slug: 'sobre', title: 'Sobre', status: 'published' },
      actor
    );
    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'publish',
      entity: 'page',
      entityId: 'p1',
      entityLabel: 'Sobre'
    });
  });

  it('records an unpublish entry', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'p1', slug: 'sobre', title: 'Sobre', status: 'published', pageKey: null });
    mockRepo.update.mockResolvedValue({ id: 'p1', slug: 'sobre', title: 'Sobre', status: 'draft' });
    const service = new PageService();

    await service.unpublish('p1', actor);

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'unpublish',
      entity: 'page',
      entityId: 'p1',
      entityLabel: 'Sobre'
    });
  });

  it('records a delete entry using the label captured before deletion', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'p1', slug: 'sobre', title: 'Sobre', status: 'draft', pageKey: null });
    const service = new PageService();

    await service.delete('p1', actor);

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'delete',
      entity: 'page',
      entityId: 'p1',
      entityLabel: 'Sobre'
    });
  });
});

describe('PageService.revertToVersion', () => {
  beforeEach(() => vi.clearAllMocks());

  const versionContent = { title: 'Sobre (antiga)', description: 'Versão antiga', layout: { version: 2, sections: [] } };

  it('applies the version content and publishes it immediately, even if the page is currently published', async () => {
    mockRepo.findById.mockResolvedValue({
      id: 'p1',
      slug: 'sobre',
      title: 'Sobre',
      description: 'Atual',
      status: 'published',
      pageKey: null
    });
    mockRepo.update.mockResolvedValue({
      id: 'p1',
      slug: 'sobre',
      title: 'Sobre (antiga)',
      description: 'Versão antiga',
      status: 'published'
    });
    const service = new PageService();

    const result = await service.revertToVersion('p1', versionContent, actor);

    expect(mockRepo.update).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({
        title: 'Sobre (antiga)',
        description: 'Versão antiga',
        layout: versionContent.layout,
        status: 'published'
      })
    );
    expect(result.status).toBe('published');
  });

  it('records a publish audit entry and snapshots the reverted content', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'p1', slug: 'sobre', title: 'Sobre', status: 'draft', pageKey: null });
    mockRepo.update.mockResolvedValue({ id: 'p1', slug: 'sobre', title: 'Sobre (antiga)', status: 'published' });
    const service = new PageService();

    await service.revertToVersion('p1', versionContent, actor);

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'publish',
      entity: 'page',
      entityId: 'p1',
      entityLabel: 'Sobre (antiga)'
    });
    expect(mockPageVersionService.snapshot).toHaveBeenCalledWith(
      { id: 'p1', slug: 'sobre', title: 'Sobre (antiga)', status: 'published' },
      actor
    );
  });

  it('throws a 404 when the page does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const service = new PageService();

    await expect(service.revertToVersion('missing', versionContent, actor)).rejects.toMatchObject({ status: 404 });
  });

  it('refuses to revert a reserved page (home/blog)', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'p1', slug: 'home', title: 'Início', status: 'published', pageKey: 'home' });
    const service = new PageService();

    await expect(service.revertToVersion('p1', versionContent, actor)).rejects.toMatchObject({ status: 400 });
  });
});
