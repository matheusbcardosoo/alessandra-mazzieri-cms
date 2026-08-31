import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockRepo = vi.hoisted(() => ({
  create: vi.fn(),
  listByPage: vi.fn(),
  findLatest: vi.fn(),
  findById: vi.fn(),
  trim: vi.fn()
}));

vi.mock('../repositories/pageVersion.repository', () => ({
  PageVersionRepository: vi.fn().mockImplementation(function PageVersionRepository() {
    return mockRepo;
  })
}));

vi.mock('../config/env', () => ({
  env: { PAGE_VERSION_HISTORY_LIMIT: 3 }
}));

vi.mock('./mediaReferences.service', () => ({
  findMissingMedia: vi.fn()
}));

import { PageVersionService } from './pageVersion.service';
import { findMissingMedia } from './mediaReferences.service';

const actor = { id: 'user-1', name: 'Ana', email: 'ana@example.com' };

const page = {
  id: 'p1',
  title: 'Sobre',
  description: 'Descrição',
  layout: { version: 2, sections: [] }
};

describe('PageVersionService.snapshot', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a version snapshot with the page content and actor', async () => {
    mockRepo.findLatest.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({ id: 'v1' });
    const service = new PageVersionService();

    await service.snapshot(page, actor);

    expect(mockRepo.create).toHaveBeenCalledWith({
      pageId: 'p1',
      title: 'Sobre',
      description: 'Descrição',
      layout: page.layout,
      actorId: 'user-1',
      actorName: 'Ana',
      actorEmail: 'ana@example.com'
    });
  });

  it('trims history to the configured limit after creating a snapshot', async () => {
    mockRepo.findLatest.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({ id: 'v1' });
    const service = new PageVersionService();

    await service.snapshot(page, actor);

    expect(mockRepo.trim).toHaveBeenCalledWith('p1', 3);
  });

  it('skips creating a snapshot when content is identical to the latest stored version', async () => {
    mockRepo.findLatest.mockResolvedValue({
      title: 'Sobre',
      description: 'Descrição',
      layout: page.layout
    });
    const service = new PageVersionService();

    await service.snapshot(page, actor);

    expect(mockRepo.create).not.toHaveBeenCalled();
    expect(mockRepo.trim).not.toHaveBeenCalled();
  });
});

describe('PageVersionService.list', () => {
  beforeEach(() => vi.clearAllMocks());

  it('enriches each version with its missingMedia list, preserving repository order', async () => {
    mockRepo.listByPage.mockResolvedValue([
      { id: 'v1', layout: { version: 2, sections: [] } },
      { id: 'v2', layout: { version: 2, sections: [] } }
    ]);
    vi.mocked(findMissingMedia)
      .mockResolvedValueOnce([{ blockId: 'b1', mediaId: 'm1' }])
      .mockResolvedValueOnce([]);
    const service = new PageVersionService();

    const result = await service.list('p1');

    expect(mockRepo.listByPage).toHaveBeenCalledWith('p1');
    expect(findMissingMedia).toHaveBeenNthCalledWith(1, { version: 2, sections: [] });
    expect(findMissingMedia).toHaveBeenNthCalledWith(2, { version: 2, sections: [] });
    expect(result).toEqual([
      { id: 'v1', layout: { version: 2, sections: [] }, missingMedia: [{ blockId: 'b1', mediaId: 'm1' }] },
      { id: 'v2', layout: { version: 2, sections: [] }, missingMedia: [] }
    ]);
  });
});

describe('PageVersionService.getForRevert', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the version when it exists and belongs to the page', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'v1', pageId: 'p1' });
    const service = new PageVersionService();

    const result = await service.getForRevert('p1', 'v1');

    expect(result).toEqual({ id: 'v1', pageId: 'p1' });
  });

  it('throws a 404 when the version does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const service = new PageVersionService();

    await expect(service.getForRevert('p1', 'missing')).rejects.toMatchObject({ status: 404 });
  });

  it('throws a 404 when the version belongs to a different page', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'v1', pageId: 'other-page' });
    const service = new PageVersionService();

    await expect(service.getForRevert('p1', 'v1')).rejects.toMatchObject({ status: 404 });
  });
});
