import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockRepo = vi.hoisted(() => ({
  findSubmissionById: vi.fn(),
  deleteSubmission: vi.fn()
}));

vi.mock('../repositories/formSubmission.repository', () => mockRepo);

const mockAuditLog = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock('./auditLog.service', () => ({ auditLogService: mockAuditLog }));

import { removeSubmission } from './formSubmission.service';

const actor = { id: 'user-1', name: 'Ana', email: 'ana@example.com' };

describe('removeSubmission audit log', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records a delete entry with a generic page+date label', async () => {
    mockRepo.findSubmissionById.mockResolvedValue({
      id: 'sub-1',
      pageId: 'page-1',
      createdAt: new Date('2026-08-30T12:00:00Z'),
      page: { title: 'Contato' }
    });
    mockRepo.deleteSubmission.mockResolvedValue({});

    await removeSubmission('sub-1', actor);

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'delete',
      entity: 'formSubmission',
      entityId: 'sub-1',
      entityLabel: expect.stringContaining('Contato')
    });
  });
});
