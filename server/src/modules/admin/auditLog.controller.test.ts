import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const mockService = vi.hoisted(() => ({
  list: vi.fn()
}));

vi.mock('../../services/auditLog.service', () => ({ auditLogService: mockService }));

import { listAuditLog } from './auditLog.controller';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(query: Record<string, string> = {}) {
  return { query } as unknown as Request;
}

describe('listAuditLog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defaults to page 1 / limit 20 and computes totalPages', async () => {
    mockService.list.mockResolvedValue({ items: [{ id: 'log-1' }], total: 45 });
    const res = makeRes();

    await listAuditLog(makeReq(), res);

    expect(mockService.list).toHaveBeenCalledWith({
      entity: undefined,
      action: undefined,
      actorId: undefined,
      startDate: undefined,
      endDate: undefined,
      limit: 20,
      offset: 0
    });
    expect(res.json).toHaveBeenCalledWith({
      data: { items: [{ id: 'log-1' }], total: 45, page: 1, limit: 20, totalPages: 3 },
      error: null
    });
  });

  it('forwards filters and computes offset from page/limit', async () => {
    mockService.list.mockResolvedValue({ items: [], total: 0 });
    const res = makeRes();

    await listAuditLog(makeReq({ entity: 'page', action: 'update', actorId: 'user-1', page: '3', limit: '10' }), res);

    expect(mockService.list).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'page', action: 'update', actorId: 'user-1', limit: 10, offset: 20 })
    );
  });
});
