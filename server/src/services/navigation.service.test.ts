import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  findByIds: vi.fn().mockResolvedValue([]),
  findChildren: vi.fn().mockResolvedValue([]),
  findPublic: vi.fn().mockResolvedValue([]),
  getNextOrder: vi.fn().mockResolvedValue(0),
  create: vi.fn(),
  update: vi.fn(),
  updateChildren: vi.fn(),
  delete: vi.fn(),
  reorder: vi.fn()
}));

vi.mock('../repositories/nav.repository', () => ({
  NavRepository: vi.fn().mockImplementation(function NavRepository() {
    return mockRepo;
  })
}));

vi.mock('../config/cache', () => ({
  cacheProvider: { set: vi.fn() },
  cacheKeys: { nav: 'nav:public' },
  cacheTTL: { nav: 3600 }
}));

const mockAuditLog = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock('./auditLog.service', () => ({ auditLogService: mockAuditLog }));

import { NavigationService } from './navigation.service';

const actor = { id: 'user-1', name: 'Ana', email: 'ana@example.com' };
const baseInput = { label: 'Sobre', type: 'INTERNAL_PAGE' as const, pageKey: 'sobre', showInNavbar: true, isVisible: true };

describe('NavigationService audit log', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records a create entry', async () => {
    mockRepo.create.mockResolvedValue({ id: 'nav-1', label: 'Sobre' });

    const service = new NavigationService();
    await service.create(baseInput, actor);

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'create',
      entity: 'navItem',
      entityId: 'nav-1',
      entityLabel: 'Sobre'
    });
  });

  it('records an update entry', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'nav-1', label: 'Sobre', showInNavbar: true, showInFooter: false, isVisible: true, isParent: false, parentId: null, type: 'INTERNAL_PAGE', pageKey: 'sobre' });
    mockRepo.update.mockResolvedValue({ id: 'nav-1', label: 'Sobre nova' });

    const service = new NavigationService();
    await service.update('nav-1', { label: 'Sobre nova' }, actor);

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'update',
      entity: 'navItem',
      entityId: 'nav-1',
      entityLabel: 'Sobre nova'
    });
  });

  it('records a delete entry using the label captured before deletion', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'nav-1', label: 'Sobre' });

    const service = new NavigationService();
    await service.delete('nav-1', actor);

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'delete',
      entity: 'navItem',
      entityId: 'nav-1',
      entityLabel: 'Sobre'
    });
  });

  it('records a single aggregated reorder entry, not one per item', async () => {
    mockRepo.findByIds.mockResolvedValue([
      { id: 'nav-1', label: 'Sobre', showInNavbar: true, isVisible: true, parentId: null, isParent: false },
      { id: 'nav-2', label: 'Contato', showInNavbar: true, isVisible: true, parentId: null, isParent: false }
    ]);
    mockRepo.reorder.mockResolvedValue([]);

    const service = new NavigationService();
    await service.reorder('navbar', [
      { id: 'nav-1', order: 0 },
      { id: 'nav-2', order: 1 }
    ], actor);

    expect(mockAuditLog.record).toHaveBeenCalledTimes(1);
    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'reorder',
      entity: 'navItem',
      entityId: null,
      entityLabel: 'Reordenação de 2 item(ns) — navbar'
    });
  });
});
