import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockRepo = vi.hoisted(() => ({
  findSingleton: vi.fn(),
  createDefault: vi.fn(),
  upsert: vi.fn()
}));

vi.mock('../repositories/siteSettings.repository', () => ({
  SiteSettingsRepository: vi.fn().mockImplementation(function SiteSettingsRepository() {
    return mockRepo;
  })
}));

vi.mock('../config/cache', () => ({
  cacheProvider: { set: vi.fn(), wrap: vi.fn() },
  cacheKeys: { siteSettings: 'site-settings:public' },
  cacheTTL: { siteSettings: 3600 }
}));

const mockAuditLog = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock('./auditLog.service', () => ({ auditLogService: mockAuditLog }));

import { SiteSettingsService } from './siteSettings.service';

const actor = { id: 'user-1', name: 'Ana', email: 'ana@example.com' };

describe('SiteSettingsService.update audit log', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records an update entry with the fixed singleton id', async () => {
    mockRepo.upsert.mockResolvedValue({ id: 'default', siteName: 'Meu Site', socials: [] });
    const service = new SiteSettingsService();

    await service.update({ siteName: 'Meu Site' }, actor);

    expect(mockAuditLog.record).toHaveBeenCalledWith({
      actor,
      action: 'update',
      entity: 'siteSettings',
      entityId: 'default',
      entityLabel: 'Meu Site'
    });
  });
});
