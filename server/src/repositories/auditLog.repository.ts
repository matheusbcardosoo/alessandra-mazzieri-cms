import { AuditAction, AuditEntity, AuditLog, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export type AuditLogCreateData = {
  actorId: string | null;
  actorName: string;
  actorEmail: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string | null;
  entityLabel: string;
};

export type AuditLogFilters = {
  entity?: string;
  action?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export class AuditLogRepository {
  create(data: AuditLogCreateData): Promise<AuditLog> {
    return prisma.auditLog.create({ data });
  }

  async findMany(filters: AuditLogFilters): Promise<{ items: AuditLog[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.entity) where.entity = filters.entity as AuditEntity;
    if (filters.action) where.action = filters.action as AuditAction;
    if (filters.actorId) where.actorId = filters.actorId;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setDate(endDate.getDate() + 1);
        where.createdAt.lt = endDate;
      }
    }

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit ?? 20,
        skip: filters.offset ?? 0
      })
    ]);

    return { items, total };
  }
}
