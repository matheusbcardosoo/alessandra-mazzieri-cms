import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminSiteSettings, updateSiteSettings } from '@/api/queries';
import { saveThemeToCache } from '@/utils/themeCache';
import type { SiteSettings } from '@/types';

export function useAdminSiteSettings(options?: { enabled?: boolean }) {
  return useQuery<SiteSettings>({
    queryKey: ['admin', 'site-settings'],
    queryFn: fetchAdminSiteSettings,
    enabled: options?.enabled
  });
}

export function useUpdateSiteSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SiteSettings) => updateSiteSettings(payload),
    onSuccess: (updatedSettings) => {
      saveThemeToCache(updatedSettings);
      qc.invalidateQueries({ queryKey: ['admin', 'site-settings'] });
      qc.invalidateQueries({ queryKey: ['site-settings'] });
      qc.invalidateQueries({ queryKey: ['admin-theme'] });
    }
  });
}
