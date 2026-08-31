import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findMany: vi.fn()
}));

vi.mock('../repositories/auditLog.repository', () => ({
  AuditLogRepository: vi.fn().mockImplementation(function AuditLogRepository() {
    return mockRepo;
  })
}));

vi.mock('../config/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

import { auditLogService } from './auditLog.service';
import { logger } from '../config/logger';

const actor = { id: 'user-1', name: 'Ana', email: 'ana@example.com' };

describe('auditLogService.record', () => {
  beforeEach(() => vi.clearAllMocks());

  it('persists a snapshot of the actor alongside the action/entity/label', async () => {
    mockRepo.create.mockResolvedValue({});

    await auditLogService.record({
      actor,
      action: 'update',
      entity: 'page',
      entityId: 'page-1',
      entityLabel: 'Sobre'
    });

    expect(mockRepo.create).toHaveBeenCalledWith({
      actorId: 'user-1',
      actorName: 'Ana',
      actorEmail: 'ana@example.com',
      action: 'update',
      entity: 'page',
      entityId: 'page-1',
      entityLabel: 'Sobre'
    });
  });

  it('never propagates when the repository write fails', async () => {
    mockRepo.create.mockRejectedValue(new Error('db down'));

    await expect(
      auditLogService.record({ actor, action: 'delete', entity: 'post', entityId: 'post-1', entityLabel: 'Artigo' })
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('auditLogService.list', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates filters straight to the repository', async () => {
    mockRepo.findMany.mockResolvedValue({ items: [], total: 0 });

    const filters = { entity: 'page', action: 'update', actorId: 'user-1', limit: 20, offset: 0 };
    const result = await auditLogService.list(filters);

    expect(mockRepo.findMany).toHaveBeenCalledWith(filters);
    expect(result).toEqual({ items: [], total: 0 });
  });
});
