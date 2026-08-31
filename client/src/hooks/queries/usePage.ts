import { useQuery } from '@tanstack/react-query';
import { fetchAdminHomePage, fetchAdminPage } from '@/api/queries';
import type { Page } from '@/types';

export function useAdminHomePage(enabled: boolean) {
  return useQuery<Page>({ queryKey: ['admin', 'page', 'home'], queryFn: fetchAdminHomePage, enabled });
}

export function useAdminPage(id: string | undefined, enabled: boolean) {
  return useQuery<Page>({
    queryKey: ['admin', 'page', id],
    queryFn: () => fetchAdminPage(id || ''),
    enabled
  });
}
