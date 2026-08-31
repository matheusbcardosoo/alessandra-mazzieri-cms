import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockRepo = vi.hoisted(() => ({
  needsSetup: vi.fn(),
  claimAndCreateAdmin: vi.fn()
}));

vi.mock('../../repositories/setup.repository', () => ({
  SetupRepository: vi.fn().mockImplementation(function SetupRepository() {
    return mockRepo;
  })
}));

import { getSetupStatus, createFirstAdmin } from './auth.service';

describe('getSetupStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports needsSetup true when the repository says so', async () => {
    mockRepo.needsSetup.mockResolvedValue(true);

    const result = await getSetupStatus();

    expect(result).toEqual({ needsSetup: true });
  });

  it('reports needsSetup false once setup has been claimed', async () => {
    mockRepo.needsSetup.mockResolvedValue(false);

    const result = await getSetupStatus();

    expect(result).toEqual({ needsSetup: false });
  });
});

describe('createFirstAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates the admin and returns a token when the claim succeeds', async () => {
    mockRepo.claimAndCreateAdmin.mockResolvedValue({
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      password: 'hashed',
      role: 'admin'
    });

    const result = await createFirstAdmin({ name: 'Ana', email: 'ana@example.com', password: 'segredo123' });

    expect(result.user).toEqual({ id: 'u1', name: 'Ana', email: 'ana@example.com', role: 'admin' });
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
  });

  it('throws a 409 HttpError when setup was already claimed by someone else', async () => {
    mockRepo.claimAndCreateAdmin.mockResolvedValue(null);

    await expect(
      createFirstAdmin({ name: 'Ana', email: 'ana@example.com', password: 'segredo123' })
    ).rejects.toMatchObject({ status: 409 });
  });
});
