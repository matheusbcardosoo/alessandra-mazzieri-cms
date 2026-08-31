import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSiteSettings } from '@/api/queries';
import { siteThemeToCssVars } from '@/utils/siteTheme';
import { getThemeFromCache, saveThemeToCache } from '@/utils/themeCache';
import type { SiteThemeCssVars } from '@/utils/siteTheme';

export type AdminThemeData = {
  siteName: string;
  initials: string;
  domain: string;
  themeCssVars: SiteThemeCssVars;
  isLoading: boolean;
};

/**
 * Hook para obter dados dinâmicos do painel de admin com base em SiteSettings.
 * Usa o endpoint cacheado em Redis (/api/public/theme) para carregamento rápido.
 *
 * Retorna: siteName, iniciais, domínio, variáveis CSS do tema, estado de carregamento.
 *
 * Exemplos:
 * - siteName: "Fernanda Biscalquim" → initials: "FB", domain: "fernanda-biscalquim"
 * - siteName: "Dr. João Silva" → initials: "JS", domain: "dr-joao-silva"
 */
export function useAdminTheme(): AdminThemeData {
  const cachedSettings = useMemo(() => getThemeFromCache(), []);

  // Usar endpoint cacheado em Redis para carregamento rápido do tema
  const { data: settings, isPending: isLoading, refetch } = useQuery({
    queryKey: ['admin-theme'],
    queryFn: fetchSiteSettings,
    placeholderData: cachedSettings ?? undefined,
    staleTime: 60 * 60 * 1000, // 1h
    gcTime: 24 * 60 * 60 * 1000 // 24h
  });

  useEffect(() => {
    if (settings) saveThemeToCache(settings);
  }, [settings]);

  // Refetch quando volta para a aba (se houver mudanças feitas em outra aba/janela)
  useEffect(() => {
    const handleFocus = () => refetch();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);

  return useMemo(() => {
    const siteName = settings?.siteName || 'Admin';

    // Extrair iniciais (primeiras letras de cada palavra)
    const initials = siteName
      .split(/\s+/)
      .map((word) => word[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 3); // Máximo 3 caracteres

    // Extrair domínio: converter para lowercase, remover acentos, substituir espaços por hífen
    const domain = siteName
      .toLowerCase()
      .normalize('NFD') // Decompor caracteres acentuados
      .replace(/[̀-ͯ]/g, '') // Remover diacríticos
      .replace(/\s+/g, '-') // Espaços → hífen
      .replace(/[^a-z0-9-]/g, ''); // Apenas caracteres válidos

    // Converter tema para variáveis CSS
    const themeCssVars = siteThemeToCssVars(settings?.theme);

    return {
      siteName,
      initials: initials || 'AD', // Fallback se algo der errado
      domain,
      themeCssVars,
      isLoading: isLoading && !cachedSettings
    };
  }, [settings, isLoading, cachedSettings]);
}
