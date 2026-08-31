import { useQuery } from '@tanstack/react-query';
import { fetchAuditLog, type FetchAuditLogParams, type PaginatedResponse } from '@/api/queries';
import type { AuditLogEntry } from '@/types';

export function useAuditLog(params: FetchAuditLogParams) {
  return useQuery<PaginatedResponse<AuditLogEntry>>({
    queryKey: ['admin', 'auditLog', params],
    queryFn: () => fetchAuditLog(params)
  });
}
