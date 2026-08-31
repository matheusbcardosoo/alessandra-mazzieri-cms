export type AuditAction = 'create' | 'update' | 'publish' | 'unpublish' | 'delete' | 'upload' | 'reorder';

export type AuditEntity = 'page' | 'post' | 'user' | 'media' | 'navItem' | 'siteSettings' | 'formSubmission';

export type AuditLogEntry = {
  id: string;
  actorId: string | null;
  actorName: string;
  actorEmail: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string | null;
  entityLabel: string;
  createdAt: string;
};
