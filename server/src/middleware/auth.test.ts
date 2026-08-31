import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { requireAuth } from './auth';

vi.mock('../config/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } }
}));

import { prisma } from '../config/prisma';

function makeRes() {
  return {} as unknown as Response;
}

function makeReq(cookies: Record<string, string>) {
  return { cookies } as unknown as Request;
}

describe('requireAuth', () => {
  it('loads the user fresh from the DB and attaches it to req.user', async () => {
    const token = jwt.sign({ id: '1' }, env.JWT_SECRET, { expiresIn: '2h' });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: '1',
      email: 'a@b.com',
      name: 'Admin',
      role: 'admin',
      sectionAccess: {}
    } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>);
    const req = makeReq({ user_session: token });
    const next = vi.fn();

    await requireAuth(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ id: '1', email: 'a@b.com', role: 'admin' });
  });

  it('calls next with a 401 error when there is no cookie', async () => {
    const req = makeReq({});
    const next = vi.fn();

    await requireAuth(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('calls next with a 401 error when the cookie token is invalid', async () => {
    const req = makeReq({ user_session: 'not-a-real-token' });
    const next = vi.fn();

    await requireAuth(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('calls next with a 401 error when the token is valid but the user no longer exists', async () => {
    const token = jwt.sign({ id: 'deleted' }, env.JWT_SECRET, { expiresIn: '2h' });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const req = makeReq({ user_session: token });
    const next = vi.fn();

    await requireAuth(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });
});
