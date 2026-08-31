import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  $queryRaw: vi.fn()
}));

const mockIsRedisHealthy = vi.hoisted(() => vi.fn());
const mockEnv = vi.hoisted(() => ({ REDIS_URL: undefined as string | undefined }));

vi.mock('../config/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../config/redis', () => ({ isRedisHealthy: mockIsRedisHealthy }));
vi.mock('../config/env', () => ({ env: mockEnv }));

import { getHealthStatus } from './health';

describe('getHealthStatus', () => {
  beforeEach(() => {
    mockPrisma.$queryRaw.mockReset();
    mockIsRedisHealthy.mockReset();
    mockEnv.REDIS_URL = undefined;
  });

  it('reports ok/ok when the DB responds and Redis is not configured', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await getHealthStatus();

    expect(result).toEqual({ status: 'ok', db: 'ok', redis: 'disabled' });
    expect(mockIsRedisHealthy).not.toHaveBeenCalled();
  });

  it('reports db error and overall error when the DB query throws', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

    const result = await getHealthStatus();

    expect(result.status).toBe('error');
    expect(result.db).toBe('error');
  });

  it('reports redis ok when configured and reachable', async () => {
    mockEnv.REDIS_URL = 'redis://localhost:6379';
    mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mockIsRedisHealthy.mockResolvedValue(true);

    const result = await getHealthStatus();

    expect(result).toEqual({ status: 'ok', db: 'ok', redis: 'ok' });
  });

  it('reports redis error (but overall status still ok) when configured and unreachable', async () => {
    mockEnv.REDIS_URL = 'redis://localhost:6379';
    mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mockIsRedisHealthy.mockResolvedValue(false);

    const result = await getHealthStatus();

    expect(result).toEqual({ status: 'ok', db: 'ok', redis: 'error' });
  });
});
