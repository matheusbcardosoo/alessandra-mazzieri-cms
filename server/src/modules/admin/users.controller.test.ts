import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createUser, updateUser, deleteUser } from './users.controller';

vi.mock('../../config/prisma', () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    userPageAccess: { findMany: vi.fn() }
  }
}));

vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('hashed') } }));

const mockAuditLog = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock('../../services/auditLog.service', () => ({ auditLogService: mockAuditLog }));

import { prisma } from '../../config/prisma';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(user: Partial<Express.AuthenticatedUser>, body: unknown = {}, params: Record<string, string> = {}) {
  return { user, body, params } as unknown as Request;
}

const fullSections = { blog: true, menu: true, media: true, forms: true, settings: true };

// NOTE: ids/names below use valid UUIDs (uuidParamSchema/pageAccess `.uuid()`) and
// 2+ char names (`name: z.string().min(2)`) instead of the plan doc's literal
// 'owner-1'/'admin-1'/'e1'/'p1'/'X' placeholders, which fail Zod validation before
// ever reaching the business logic under test (see task-5-report.md).
const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';
const EDITOR_ID = '33333333-3333-4333-8333-333333333333';
const PAGE_ID = '44444444-4444-4444-8444-444444444444';

describe('createUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an owner trying to create anything but an editor', async () => {
    const req = makeReq(
      { id: OWNER_ID, role: 'owner', sectionAccess: fullSections },
      { email: 'x@x.com', password: 'password1', name: 'Xx', role: 'owner', sectionAccess: fullSections, pageAccess: [] }
    );
    await expect(createUser(req, makeRes())).rejects.toMatchObject({ status: 400 });
  });

  it('rejects creating a second owner', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(
      { id: 'existing-owner' } as unknown as Awaited<ReturnType<typeof prisma.user.findFirst>>
    );
    const req = makeReq(
      { id: ADMIN_ID, role: 'admin', sectionAccess: fullSections },
      { email: 'x@x.com', password: 'password1', name: 'Xx', role: 'owner', sectionAccess: fullSections, pageAccess: [] }
    );
    await expect(createUser(req, makeRes())).rejects.toMatchObject({ status: 409 });
  });

  it('rejects an owner granting a section it does not have itself', async () => {
    const req = makeReq(
      { id: OWNER_ID, role: 'owner', sectionAccess: { blog: false, menu: true, media: true, forms: true, settings: true } },
      {
        email: 'x@x.com',
        password: 'password1',
        name: 'Xx',
        role: 'editor',
        sectionAccess: fullSections, // includes blog: true, which the owner lacks
        pageAccess: []
      }
    );
    await expect(createUser(req, makeRes())).rejects.toMatchObject({ status: 400 });
  });

  it('rejects a duplicate email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      { id: 'existing' } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>
    );
    const req = makeReq(
      { id: ADMIN_ID, role: 'admin', sectionAccess: fullSections },
      { email: 'dup@x.com', password: 'password1', name: 'Xx', role: 'editor', sectionAccess: fullSections, pageAccess: [] }
    );
    await expect(createUser(req, makeRes())).rejects.toMatchObject({ status: 409 });
  });

  it('creates an editor when the owner grants only sections/pages it has', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.userPageAccess.findMany).mockResolvedValue(
      [{ pageId: PAGE_ID }] as unknown as Awaited<ReturnType<typeof prisma.userPageAccess.findMany>>
    );
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'new-editor',
      email: 'e@x.com',
      name: 'Ee',
      role: 'editor',
      sectionAccess: fullSections,
      pageAccess: [{ pageId: PAGE_ID }]
    } as unknown as Awaited<ReturnType<typeof prisma.user.create>>);
    const req = makeReq(
      { id: OWNER_ID, role: 'owner', sectionAccess: fullSections },
      { email: 'e@x.com', password: 'password1', name: 'Ee', role: 'editor', sectionAccess: fullSections, pageAccess: [PAGE_ID] }
    );
    const res = makeRes();

    await createUser(req, res);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'editor',
          pageAccess: { create: [{ pageId: PAGE_ID }] }
        })
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('records an audit log entry for the created user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.userPageAccess.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'new-editor',
      email: 'e@x.com',
      name: 'Ee',
      role: 'editor',
      sectionAccess: fullSections,
      pageAccess: []
    } as unknown as Awaited<ReturnType<typeof prisma.user.create>>);
    const req = makeReq(
      { id: ADMIN_ID, role: 'admin', name: 'Admin', email: 'admin@x.com', sectionAccess: fullSections },
      { email: 'e@x.com', password: 'password1', name: 'Ee', role: 'editor', sectionAccess: fullSections, pageAccess: [] }
    );

    await createUser(req, makeRes());

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor: { id: ADMIN_ID, role: 'admin', name: 'Admin', email: 'admin@x.com', sectionAccess: fullSections },
      action: 'create',
      entity: 'user',
      entityId: 'new-editor',
      entityLabel: 'Ee'
    });
  });
});

describe('updateUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects editing your own row', async () => {
    const req = makeReq({ id: OWNER_ID, role: 'owner', sectionAccess: fullSections }, {}, { id: OWNER_ID });
    await expect(updateUser(req, makeRes())).rejects.toMatchObject({ status: 403 });
  });

  it('rejects a role change', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      { id: EDITOR_ID, role: 'editor' } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>
    );
    const req = makeReq(
      { id: OWNER_ID, role: 'owner', sectionAccess: fullSections },
      { role: 'owner' },
      { id: EDITOR_ID }
    );
    await expect(updateUser(req, makeRes())).rejects.toMatchObject({ status: 400 });
  });

  it('404s when the target is the admin account', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      { id: ADMIN_ID, role: 'admin' } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>
    );
    const req = makeReq({ id: OWNER_ID, role: 'owner', sectionAccess: fullSections }, {}, { id: ADMIN_ID });
    await expect(updateUser(req, makeRes())).rejects.toMatchObject({ status: 404 });
  });

  it('records an audit log entry for the updated user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      { id: EDITOR_ID, role: 'editor', sectionAccess: fullSections } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>
    );
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: EDITOR_ID,
      email: 'e@x.com',
      name: 'Editor Novo',
      role: 'editor',
      sectionAccess: fullSections,
      pageAccess: []
    } as unknown as Awaited<ReturnType<typeof prisma.user.update>>);
    const req = makeReq(
      { id: ADMIN_ID, role: 'admin', name: 'Admin', email: 'admin@x.com', sectionAccess: fullSections },
      { name: 'Editor Novo' },
      { id: EDITOR_ID }
    );

    await updateUser(req, makeRes());

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor: { id: ADMIN_ID, role: 'admin', name: 'Admin', email: 'admin@x.com', sectionAccess: fullSections },
      action: 'update',
      entity: 'user',
      entityId: EDITOR_ID,
      entityLabel: 'Editor Novo'
    });
  });
});

describe('deleteUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects deleting your own row', async () => {
    const req = makeReq({ id: OWNER_ID, role: 'owner', sectionAccess: fullSections }, {}, { id: OWNER_ID });
    await expect(deleteUser(req, makeRes())).rejects.toMatchObject({ status: 403 });
  });

  it('rejects an owner deleting a non-editor', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      { id: ADMIN_ID, role: 'admin' } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>
    );
    const req = makeReq({ id: OWNER_ID, role: 'owner', sectionAccess: fullSections }, {}, { id: ADMIN_ID });
    await expect(deleteUser(req, makeRes())).rejects.toMatchObject({ status: 404 });
  });

  it('records an audit log entry using the label captured before deletion', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      { id: EDITOR_ID, role: 'editor', name: 'Editor Antigo' } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>
    );
    const req = makeReq(
      { id: ADMIN_ID, role: 'admin', name: 'Admin', email: 'admin@x.com', sectionAccess: fullSections },
      {},
      { id: EDITOR_ID }
    );

    await deleteUser(req, makeRes());

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor: { id: ADMIN_ID, role: 'admin', name: 'Admin', email: 'admin@x.com', sectionAccess: fullSections },
      action: 'delete',
      entity: 'user',
      entityId: EDITOR_ID,
      entityLabel: 'Editor Antigo'
    });
  });
});
