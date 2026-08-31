import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../../services/page.service', () => {
  const mockListAdmin = vi.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
  const mockGetAdminById = vi.fn();
  const mockRevertToVersion = vi.fn();
  class PageService {
    listAdmin = mockListAdmin;
    getAdminById = mockGetAdminById;
    revertToVersion = mockRevertToVersion;
  }
  return { PageService, __mockListAdmin: mockListAdmin, __mockGetAdminById: mockGetAdminById, __mockRevertToVersion: mockRevertToVersion };
});

vi.mock('../../services/home.service', () => {
  const mockHomeRevertToVersion = vi.fn();
  class HomeService {
    revertToVersion = mockHomeRevertToVersion;
  }
  return { HomeService, __mockHomeRevertToVersion: mockHomeRevertToVersion };
});

vi.mock('../../services/pageVersion.service', () => {
  const mockList = vi.fn();
  const mockGetForRevert = vi.fn();
  return { pageVersionService: { list: mockList, getForRevert: mockGetForRevert }, __mockList: mockList, __mockGetForRevert: mockGetForRevert };
});

vi.mock('../../middleware/permissions', () => ({
  getAccessiblePageIds: vi.fn()
}));

vi.mock('../../services/mediaReferences.service', () => ({
  findMissingMedia: vi.fn()
}));

import { getPageMissingMedia, listPages, listPageVersions, revertPageVersion } from './pages.controller';
import * as pageServiceModule from '../../services/page.service';
import * as homeServiceModule from '../../services/home.service';
import * as pageVersionServiceModule from '../../services/pageVersion.service';
import { getAccessiblePageIds } from '../../middleware/permissions';
import { findMissingMedia } from '../../services/mediaReferences.service';

const mockListAdmin = (pageServiceModule as unknown as { __mockListAdmin: ReturnType<typeof vi.fn> }).__mockListAdmin;
const mockGetAdminById = (pageServiceModule as unknown as { __mockGetAdminById: ReturnType<typeof vi.fn> }).__mockGetAdminById;
const mockRevertToVersion = (pageServiceModule as unknown as { __mockRevertToVersion: ReturnType<typeof vi.fn> }).__mockRevertToVersion;
const mockHomeRevertToVersion = (homeServiceModule as unknown as { __mockHomeRevertToVersion: ReturnType<typeof vi.fn> })
  .__mockHomeRevertToVersion;
const mockList = (pageVersionServiceModule as unknown as { __mockList: ReturnType<typeof vi.fn> }).__mockList;
const mockGetForRevert = (pageVersionServiceModule as unknown as { __mockGetForRevert: ReturnType<typeof vi.fn> }).__mockGetForRevert;

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('listPages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('admin gets the unfiltered list, excluding home by default', async () => {
    const req = { user: { id: 'a1', role: 'admin' }, query: {} } as unknown as Request;
    await listPages(req, makeRes());
    expect(mockListAdmin).toHaveBeenCalledWith(false, undefined);
    expect(getAccessiblePageIds).not.toHaveBeenCalled();
  });

  it('owner/editor get a list restricted to their granted page ids', async () => {
    vi.mocked(getAccessiblePageIds).mockResolvedValue(['p1']);
    const req = { user: { id: 'e1', role: 'editor' }, query: {} } as unknown as Request;
    await listPages(req, makeRes());
    expect(getAccessiblePageIds).toHaveBeenCalledWith('e1');
    expect(mockListAdmin).toHaveBeenCalledWith(false, ['p1']);
  });

  it('passes includeHome=true through when the query flag is set (used by the user-access page picker)', async () => {
    const req = { user: { id: 'a1', role: 'admin' }, query: { includeHome: 'true' } } as unknown as Request;
    await listPages(req, makeRes());
    expect(mockListAdmin).toHaveBeenCalledWith(true, undefined);
  });

  it('treats any non-"true" includeHome value as false', async () => {
    const req = { user: { id: 'a1', role: 'admin' }, query: { includeHome: 'yes' } } as unknown as Request;
    await listPages(req, makeRes());
    expect(mockListAdmin).toHaveBeenCalledWith(false, undefined);
  });
});

const PAGE_ID = '14f18862-de0d-40e8-a40c-d3cc4f70c32e';
const VERSION_ID = '853ce490-83c5-4320-b531-b217a236b541';

describe('listPageVersions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the version history for the given page id', async () => {
    mockList.mockResolvedValue([{ id: VERSION_ID }]);
    const req = { params: { id: PAGE_ID } } as unknown as Request;
    const res = makeRes();

    await listPageVersions(req, res);

    expect(mockList).toHaveBeenCalledWith(PAGE_ID);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [{ id: VERSION_ID }] }));
  });
});

describe('revertPageVersion', () => {
  beforeEach(() => vi.clearAllMocks());

  const version = { id: VERSION_ID, pageId: PAGE_ID, title: 'Antiga', description: null, layout: { version: 2, sections: [] } };

  it('reverts a regular page through PageService.revertToVersion', async () => {
    mockGetAdminById.mockResolvedValue({ id: PAGE_ID, pageKey: null, slug: 'sobre' });
    mockGetForRevert.mockResolvedValue(version);
    mockRevertToVersion.mockResolvedValue({ id: PAGE_ID, title: 'Antiga', status: 'published' });
    const req = { params: { id: PAGE_ID, versionId: VERSION_ID }, user: { id: 'u1' } } as unknown as Request;

    await revertPageVersion(req, makeRes());

    expect(mockGetForRevert).toHaveBeenCalledWith(PAGE_ID, VERSION_ID);
    expect(mockRevertToVersion).toHaveBeenCalledWith(
      PAGE_ID,
      { title: 'Antiga', description: null, layout: { version: 2, sections: [] } },
      { id: 'u1' }
    );
    expect(mockHomeRevertToVersion).not.toHaveBeenCalled();
  });

  it('reverts the home page through HomeService.revertToVersion instead', async () => {
    mockGetAdminById.mockResolvedValue({ id: PAGE_ID, pageKey: 'home', slug: 'home' });
    mockGetForRevert.mockResolvedValue(version);
    mockHomeRevertToVersion.mockResolvedValue({ id: PAGE_ID, title: 'Antiga', status: 'published' });
    const req = { params: { id: PAGE_ID, versionId: VERSION_ID }, user: { id: 'u1' } } as unknown as Request;

    await revertPageVersion(req, makeRes());

    expect(mockHomeRevertToVersion).toHaveBeenCalledWith(
      PAGE_ID,
      { title: 'Antiga', description: null, layout: { version: 2, sections: [] } },
      { id: 'u1' }
    );
    expect(mockRevertToVersion).not.toHaveBeenCalled();
  });

  it('refuses to revert the blog page (reserved, no version history)', async () => {
    mockGetAdminById.mockResolvedValue({ id: PAGE_ID, pageKey: 'blog', slug: 'blog' });
    mockGetForRevert.mockResolvedValue(version);
    const req = { params: { id: PAGE_ID, versionId: VERSION_ID }, user: { id: 'u1' } } as unknown as Request;

    await expect(revertPageVersion(req, makeRes())).rejects.toMatchObject({ status: 400 });
    expect(mockRevertToVersion).not.toHaveBeenCalled();
    expect(mockHomeRevertToVersion).not.toHaveBeenCalled();
  });
});

describe('getPageMissingMedia', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the missing media refs for the page\'s current saved layout', async () => {
    mockGetAdminById.mockResolvedValue({ id: PAGE_ID, layout: { version: 2, sections: [] } });
    vi.mocked(findMissingMedia).mockResolvedValue([{ blockId: 'b1', mediaId: 'm1' }]);
    const req = { params: { id: PAGE_ID } } as unknown as Request;
    const res = makeRes();

    await getPageMissingMedia(req, res);

    expect(mockGetAdminById).toHaveBeenCalledWith(PAGE_ID);
    expect(findMissingMedia).toHaveBeenCalledWith({ version: 2, sections: [] });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [{ blockId: 'b1', mediaId: 'm1' }] }));
  });
});
