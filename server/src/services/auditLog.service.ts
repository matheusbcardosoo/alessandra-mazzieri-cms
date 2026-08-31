import { AuditAction, AuditEntity, AuditLog } from '@prisma/client';
import { AuditLogFilters, AuditLogRepository } from '../repositories/auditLog.repository';
import { logger } from '../config/logger';

const repository = new AuditLogRepository();

export type AuditActor = Pick<Express.AuthenticatedUser, 'id' | 'name' | 'email'>;

export type RecordAuditLogParams = {
  actor: AuditActor;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string | null;
  entityLabel: string;
};

export const auditLogService = {
  // Nunca propaga: a escrita principal já foi commitada quando isto roda,
  // então uma falha aqui não pode reverter/derrubar a resposta da request.
  async record(params: RecordAuditLogParams): Promise<void> {
    try {
      await repository.create({
        actorId: params.actor.id,
        actorName: params.actor.name,
        actorEmail: params.actor.email,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        entityLabel: params.entityLabel
      });
    } catch (err) {
      logger.error({ err, ...params }, '[auditLog] Failed to record entry');
    }
  },

  async list(filters: AuditLogFilters): Promise<{ items: AuditLog[]; total: number }> {
    return repository.findMany(filters);
  }
};
