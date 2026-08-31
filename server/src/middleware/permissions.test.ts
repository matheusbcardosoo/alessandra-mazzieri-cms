import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { requireRole, requireSection, requirePageAccess, hasPageAccess, getAccessiblePageIds } from './permissions';

vi.mock('../config/prisma', () => ({
  prisma: {
    userPageAccess: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

import { prisma } from '../config/prisma';

function makeReq(user?: Partial<Express.AuthenticatedUser>): Request {
  return { user: user as Express.AuthenticatedUser } as unknown as Request;
}

function makeNext() {
  return vi.fn() as unknown as NextFunction;
}

describe('requireRole', () => {
  it('calls next() when the user has one of the allowed roles', () => {
    const next = makeNext();
    requireRole('admin', 'owner')(makeReq({ role: 'owner' }), {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(403) when the user role is not allowed', () => {
    const next = makeNext();
    requireRole('admin', 'owner')(makeReq({ role: 'editor' }), {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });
});

describe('requireSection', () => {
  it('always passes for admin regardless of sectionAccess', () => {
    const next = makeNext();
    requireSection('blog')(
      makeReq({ role: 'admin', sectionAccess: { blog: false, menu: false, media: false, forms: false, settings: false } }),
      {} as Response,
      next
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('passes for owner/editor when the section flag is true', () => {
    const next = makeNext();
    requireSection('blog')(
      makeReq({ role: 'editor', sectionAccess: { blog: true, menu: false, media: false, forms: false, settings: false } }),
      {} as Response,
      next
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects with 403 when the section flag is false or missing', () => {
    const next = makeNext();
    requireSection('blog')(
      makeReq({ role: 'editor', sectionAccess: { blog: false, menu: false, media: false, forms: false, settings: false } }),
      {} as Response,
      next
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });
});

describe('requirePageAccess', () => {
  beforeEach(() => vi.clearAllMocks());

  it('always passes for admin without querying the DB', async () => {
    const next = makeNext();
    await requirePageAccess(async () => 'page-1')(makeReq({ role: 'admin' }), {} as Response, next);
    expect(next).toHaveBeenCalledWith();
    expect(prisma.userPageAccess.findUnique).not.toHaveBeenCalled();
  });

  it('passes for owner/editor when a UserPageAccess row exists', async () => {
    vi.mocked(prisma.userPageAccess.findUnique).mockResolvedValue(
      { id: 'x' } as unknown as Awaited<ReturnType<typeof prisma.userPageAccess.findUnique>>
    );
    const next = makeNext();
    await requirePageAccess(async () => 'page-1')(makeReq({ id: 'user-1', role: 'editor' }), {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects with 403 when no UserPageAccess row exists', async () => {
    vi.mocked(prisma.userPageAccess.findUnique).mockResolvedValue(null);
    const next = makeNext();
    await requirePageAccess(async () => 'page-1')(makeReq({ id: 'user-1', role: 'editor' }), {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });
});

describe('hasPageAccess', () => {
  it('returns true when a row exists, false otherwise', async () => {
    vi.mocked(prisma.userPageAccess.findUnique).mockResolvedValueOnce(
      { id: 'x' } as unknown as Awaited<ReturnType<typeof prisma.userPageAccess.findUnique>>
    );
    await expect(hasPageAccess('u1', 'p1')).resolves.toBe(true);

    vi.mocked(prisma.userPageAccess.findUnique).mockResolvedValueOnce(null);
    await expect(hasPageAccess('u1', 'p1')).resolves.toBe(false);
  });
});

describe('getAccessiblePageIds', () => {
  it('returns the list of pageIds granted to a user', async () => {
    vi.mocked(prisma.userPageAccess.findMany).mockResolvedValue(
      [{ pageId: 'p1' }, { pageId: 'p2' }] as unknown as Awaited<ReturnType<typeof prisma.userPageAccess.findMany>>
    );
    await expect(getAccessiblePageIds('u1')).resolves.toEqual(['p1', 'p2']);
  });
});
