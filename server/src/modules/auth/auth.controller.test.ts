import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { getCurrentUser, getSetupStatus, createFirstAdmin } from './auth.controller';

vi.mock('../../services/home.service', () => {
  const mockGetAdmin = vi.fn().mockResolvedValue({ id: 'home-page-id' });
  return {
    HomeService: class HomeService {
      getAdmin = mockGetAdmin;
    }
  };
});

vi.mock('../../middleware/permissions', () => ({
  hasPageAccess: vi.fn()
}));

const mockAuthService = vi.hoisted(() => ({
  login: vi.fn(),
  getSetupStatus: vi.fn(),
  createFirstAdmin: vi.fn()
}));

vi.mock('./auth.service', () => mockAuthService);

import { hasPageAccess } from '../../middleware/permissions';
import { HttpError } from '../../utils/errors';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('getCurrentUser', () => {
  it('always reports canAccessHome true for admin, without querying page access', async () => {
    const req = {
      user: { id: 'u1', email: 'a@b.com', name: 'Admin', role: 'admin', sectionAccess: {} }
    } as unknown as Request;
    const res = makeRes();

    await getCurrentUser(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'admin', canAccessHome: true }) })
    );
    expect(hasPageAccess).not.toHaveBeenCalled();
  });

  it('derives canAccessHome from UserPageAccess for owner/editor', async () => {
    vi.mocked(hasPageAccess).mockResolvedValue(true);
    const req = {
      user: {
        id: 'u2',
        email: 'o@b.com',
        name: 'Owner',
        role: 'owner',
        sectionAccess: { blog: true, menu: false, media: false, forms: false, settings: false }
      }
    } as unknown as Request;
    const res = makeRes();

    await getCurrentUser(req, res);

    expect(hasPageAccess).toHaveBeenCalledWith('u2', 'home-page-id');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ canAccessHome: true }) }));
  });
});

describe('getSetupStatus', () => {
  it('returns the needsSetup flag from the service', async () => {
    mockAuthService.getSetupStatus.mockResolvedValue({ needsSetup: true });
    const req = {} as Request;
    const res = makeRes();

    await getSetupStatus(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { needsSetup: true } }));
  });
});

describe('createFirstAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates the admin, sets the session cookie and returns the user', async () => {
    mockAuthService.createFirstAdmin.mockResolvedValue({
      token: 'signed-token',
      user: { id: 'u1', name: 'Ana', email: 'ana@example.com', role: 'admin' }
    });
    const req = { body: { name: 'Ana', email: 'ana@example.com', password: 'segredo123' } } as Request;
    const res = makeRes();

    await createFirstAdmin(req, res);

    expect(mockAuthService.createFirstAdmin).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'segredo123'
    });
    expect(res.cookie).toHaveBeenCalledWith('user_session', 'signed-token', expect.any(Object));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: { user: { id: 'u1', name: 'Ana', email: 'ana@example.com', role: 'admin' } } })
    );
  });

  it('propagates the 409 from the service without setting a cookie when setup is already complete', async () => {
    mockAuthService.createFirstAdmin.mockRejectedValue(new HttpError(409, 'Setup already completed'));
    const req = { body: { name: 'Ana', email: 'ana@example.com', password: 'segredo123' } } as Request;
    const res = makeRes();

    await expect(createFirstAdmin(req, res)).rejects.toMatchObject({ status: 409 });
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('rejects an invalid payload before calling the service', async () => {
    const req = { body: { name: '', email: 'not-an-email', password: '123' } } as Request;
    const res = makeRes();

    await expect(createFirstAdmin(req, res)).rejects.toThrow();
    expect(mockAuthService.createFirstAdmin).not.toHaveBeenCalled();
  });
});
