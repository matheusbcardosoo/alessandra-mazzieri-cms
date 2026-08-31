import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PageStatus } from '@prisma/client';

const mockRepo = vi.hoisted(() => ({
  findBySlugOrKey: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn()
}));

vi.mock('../repositories/page.repository', () => ({
  PageRepository: vi.fn().mockImplementation(function PageRepository() {
    return mockRepo;
  })
}));

vi.mock('../config/cache', () => ({
  cacheProvider: { set: vi.fn(), del: vi.fn(), wrap: vi.fn() },
  cacheKeys: { home: 'home:public', page: (slug: string) => `page:${slug}` },
  cacheTTL: { home: 3600 }
}));

const mockAuditLog = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock('./auditLog.service', () => ({ auditLogService: mockAuditLog }));

const mockPageVersionService = vi.hoisted(() => ({ snapshot: vi.fn() }));
vi.mock('./pageVersion.service', () => ({ pageVersionService: mockPageVersionService }));

import { HomeService } from './home.service';

const actor = { id: 'user-1', name: 'Ana', email: 'ana@example.com' };

describe('HomeService.updateHome audit log', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records an update entry for an explicit admin edit', async () => {
    mockRepo.findById.mockResolvedValue({
      id: 'home-1',
      pageKey: 'home',
      slug: 'home',
      title: 'Início',
      description: null,
      layout: { version: 2, sections: [] },
      status: PageStatus.published,
      publishedAt: new Date()
    });
    mockRepo.update.mockResolvedValue({
      id: 'home-1',
      pageKey: 'home',
      slug: 'home',
      title: 'Início novo',
      layout: { version: 2, sections: [] },
      status: PageStatus.published
    });
    const service = new HomeService();

    await service.updateHome('home-1', { title: 'Início novo' }, actor);

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'update',
      entity: 'page',
      entityId: 'home-1',
      entityLabel: 'Início novo'
    });
  });

  it('snapshots the resulting page into the version history', async () => {
    mockRepo.findById.mockResolvedValue({
      id: 'home-1',
      pageKey: 'home',
      slug: 'home',
      title: 'Início',
      description: null,
      layout: { version: 2, sections: [] },
      status: PageStatus.published,
      publishedAt: new Date()
    });
    const updated = {
      id: 'home-1',
      pageKey: 'home',
      slug: 'home',
      title: 'Início novo',
      layout: { version: 2, sections: [] },
      status: PageStatus.published
    };
    mockRepo.update.mockResolvedValue(updated);
    const service = new HomeService();

    await service.updateHome('home-1', { title: 'Início novo' }, actor);

    expect(mockPageVersionService.snapshot).toHaveBeenCalledWith(updated, actor);
  });
});

describe('HomeService.revertToVersion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('applies the version content through updateHome and republishes it', async () => {
    mockRepo.findById.mockResolvedValue({
      id: 'home-1',
      pageKey: 'home',
      slug: 'home',
      title: 'Início',
      description: null,
      layout: { version: 2, sections: [] },
      status: PageStatus.published,
      publishedAt: new Date()
    });
    mockRepo.update.mockResolvedValue({
      id: 'home-1',
      pageKey: 'home',
      slug: 'home',
      title: 'Início (antiga)',
      description: 'Versão antiga',
      layout: { version: 2, sections: [] },
      status: PageStatus.published
    });
    const service = new HomeService();

    const result = await service.revertToVersion(
      'home-1',
      { title: 'Início (antiga)', description: 'Versão antiga', layout: { version: 2, sections: [] } },
      actor
    );

    expect(mockRepo.update).toHaveBeenCalledWith(
      'home-1',
      expect.objectContaining({ title: 'Início (antiga)', description: 'Versão antiga' })
    );
    expect(result.title).toBe('Início (antiga)');
  });
});
