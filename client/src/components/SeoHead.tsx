import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSiteSettings } from '../api/queries';

// Get cached site name from localStorage (client-only; não existe em SSR).
const getCachedSiteName = () => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem('site_theme_cache');
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed.settings?.siteName || null;
  } catch {
    return null;
  }
};

export function SeoHead({
  title,
  description,
  appendSiteName = true
}: {
  title: string;
  description?: string;
  /** Home's title is written by the admin as the full `<title>` tag already — pass false to skip appending "| SiteName". */
  appendSiteName?: boolean;
}) {
  // Fetch site config (includes siteName, theme, etc.)
  const { data: settings } = useQuery({
    queryKey: ['site-config'],
    queryFn: fetchSiteSettings,
    staleTime: 60 * 60 * 1000
  });

  const siteName = settings?.siteName || getCachedSiteName() || 'Meu Site';

  useEffect(() => {
    document.title = appendSiteName ? `${title} | ${siteName}` : title;
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    }
  }, [title, description, siteName, appendSiteName]);

  return null;
}
