import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockTx = vi.hoisted(() => ({
  siteSettings: {
    upsert: vi.fn(),
    updateMany: vi.fn()
  },
  user: {
    count: vi.fn(),
    create: vi.fn()
  }
}));

const mockPrisma = vi.hoisted(() => ({
  siteSettings: { findUnique: vi.fn() },
  user: { count: vi.fn() },
  $transaction: vi.fn((callback: (tx: typeof mockTx) => unknown) => callback(mockTx))
}));

vi.mock('../config/prisma', () => ({ prisma: mockPrisma }));

import { SetupRepository } from './setup.repository';

describe('SetupRepository.needsSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.count.mockResolvedValue(0);
  });

  it('is true when no SiteSettings row exists yet and there are no users', async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue(null);

    await expect(new SetupRepository().needsSetup()).resolves.toBe(true);
  });

  it('is true when the row exists but setupCompletedAt is null and there are no users', async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue({ id: 'default', setupCompletedAt: null });

    await expect(new SetupRepository().needsSetup()).resolves.toBe(true);
  });

  it('is false once setupCompletedAt is set', async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue({ id: 'default', setupCompletedAt: new Date() });

    await expect(new SetupRepository().needsSetup()).resolves.toBe(false);
  });

  it('is false when a user already exists even if setupCompletedAt is still null (pre-existing database)', async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue({ id: 'default', setupCompletedAt: null });
    mockPrisma.user.count.mockResolvedValue(1);

    await expect(new SetupRepository().needsSetup()).resolves.toBe(false);
  });
});

describe('SetupRepository.claimAndCreateAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.user.count.mockResolvedValue(0);
  });

  const input = { name: 'Ana', email: 'ana@example.com', passwordHash: 'hashed' };

  it('creates the user when the conditional claim affects a row', async () => {
    mockTx.siteSettings.updateMany.mockResolvedValue({ count: 1 });
    mockTx.user.create.mockResolvedValue({ id: 'u1', ...input, role: 'admin' });

    const result = await new SetupRepository().claimAndCreateAdmin(input);

    expect(mockTx.siteSettings.upsert).toHaveBeenCalled();
    expect(mockTx.user.create).toHaveBeenCalledWith({
      data: { name: 'Ana', email: 'ana@example.com', password: 'hashed', role: 'admin' }
    });
    expect(result).toMatchObject({ id: 'u1' });
  });

  it('does not create a user when the claim affects zero rows (already set up)', async () => {
    mockTx.siteSettings.updateMany.mockResolvedValue({ count: 0 });

    const result = await new SetupRepository().claimAndCreateAdmin(input);

    expect(mockTx.user.create).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('does not create a user when one already exists, even though the flag was never claimed', async () => {
    mockTx.user.count.mockResolvedValue(1);

    const result = await new SetupRepository().claimAndCreateAdmin(input);

    expect(mockTx.siteSettings.upsert).not.toHaveBeenCalled();
    expect(mockTx.user.create).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
