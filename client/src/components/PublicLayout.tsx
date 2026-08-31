import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { fetchSiteSettings } from '../api/queries';
import { WhatsAppFloatingButton } from './WhatsAppFloatingButton';
import { siteThemeToCssVars } from '../utils/siteTheme';
import type { SiteSettings } from '../types';

type GtagWindow = Window & { dataLayer?: unknown[][]; gtag?: (...args: unknown[]) => void };

// Buscar settings cacheados para renderização inicial (fallback).
// No SSR não existe localStorage — os dados reais já chegam via
// dehydrate/hydrate do React Query, então retornamos null e seguimos.
const getCachedSettings = (): SiteSettings | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem('site_theme_cache');
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed.settings;
  } catch {
    return null;
  }
};

export function PublicLayout() {
  const cachedSettings = getCachedSettings();

  // Query única e otimizada: carrega toda a configuração pública (Redis-cached)
  // Inclui: tema, branding, sociais, WhatsApp, etc
  const { data: settings, isPending, refetch } = useQuery({
    queryKey: ['site-config'],
    queryFn: fetchSiteSettings,
    staleTime: 60 * 60 * 1000, // 1h - tema/branding muda raramente
    gcTime: 24 * 60 * 60 * 1000 // 24h
  });

  // Refetch quando volta para a aba (window focus)
  useEffect(() => {
    const handleFocus = () => refetch();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);

  // Aplicar variáveis CSS ao document.documentElement para portals (menu mobile)
  useEffect(() => {
    const currentSettings = settings || cachedSettings;
    if (!currentSettings?.theme) return;

    const cssVars = siteThemeToCssVars(currentSettings.theme);
    Object.entries(cssVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, [settings, cachedSettings]);

  const isLoading = isPending && !cachedSettings;

  // Atualizar localStorage quando configuração for carregada
  useEffect(() => {
    if (settings) {
      try {
        localStorage.setItem('site_theme_cache', JSON.stringify({
          version: 1,
          settings: {
            siteName: settings.siteName,
            brandTagline: settings.brandTagline,
            logoUrl: settings.logoUrl,
            theme: settings.theme,
            socials: settings.socials,
            whatsappEnabled: settings.whatsappEnabled,
            whatsappLink: settings.whatsappLink,
            whatsappMessage: settings.whatsappMessage,
            whatsappPosition: settings.whatsappPosition,
            hideScheduleCta: settings.hideScheduleCta,
            gaId: settings.gaId,
            gscVerification: settings.gscVerification
          },
          timestamp: Date.now()
        }));
      } catch {
        // Silent fail - cache não crítico
      }
    }
  }, [settings]);

  // Injetar Google Fonts dinamicamente quando tipografia for configurada
  useEffect(() => {
    if (!settings?.theme?.typography) return;

    const typography = settings.theme.typography;
    const fonts: string[] = [];

    if (typography.headingFont) {
      fonts.push(`family=${encodeURIComponent(typography.headingFont)}:wght@400;600;700`);
    }
    if (typography.bodyFont) {
      fonts.push(`family=${encodeURIComponent(typography.bodyFont)}:wght@400;500`);
    }

    if (!fonts.length) return;

    const existing = document.getElementById('gfonts-dynamic');
    if (existing) existing.remove();

    const link = document.createElement('link');
    link.id = 'gfonts-dynamic';
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${fonts.join('&')}&display=swap`;
    document.head.appendChild(link);

    return () => {
      document.getElementById('gfonts-dynamic')?.remove();
    };
  }, [settings?.theme?.typography?.headingFont, settings?.theme?.typography?.bodyFont]);

  // Injetar Google Analytics
  useEffect(() => {
    if (!settings?.gaId) return;

    // Não injetar em desenvolvimento
    if (import.meta.env.DEV) return;

    const scriptId = 'gtag-script';
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${settings.gaId}`;
    script.async = true;
    document.head.appendChild(script);

    // Setup gtag
    const gtagWindow = window as GtagWindow;
    gtagWindow.dataLayer = gtagWindow.dataLayer || [];
    function gtag(...args: unknown[]) {
      gtagWindow.dataLayer!.push(args);
    }
    gtagWindow.gtag = gtag;
    gtag('js', new Date());
    gtag('config', settings.gaId);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [settings?.gaId]);

  // Injetar Google Search Console verification
  useEffect(() => {
    if (!settings?.gscVerification) return;

    const metaId = 'gsc-verification-meta';
    const existing = document.getElementById(metaId);
    if (existing) return;

    const meta = document.createElement('meta');
    meta.id = metaId;
    meta.name = 'google-site-verification';
    meta.content = settings.gscVerification;
    document.head.appendChild(meta);

    return () => {
      document.getElementById(metaId)?.remove();
    };
  }, [settings?.gscVerification]);

  if (isLoading) {
    return <PublicThemeLoadingScreen />;
  }

  // Usar dados do servidor, fallback para cache
  const currentSettings = settings || cachedSettings;

  return (
    <div className="app-shell" style={siteThemeToCssVars(currentSettings?.theme)}>
      <Navbar settings={currentSettings ?? undefined} />
      <main className="app-main">
        <Outlet />
      </main>
      <WhatsAppFloatingButton settings={currentSettings ?? undefined} />
      <Footer settings={currentSettings ?? undefined} />
    </div>
  );
}

function PublicThemeLoadingScreen() {
  return (
    <div
      className="public-theme-loader"
      role="status"
      aria-live="polite"
      aria-label="Carregando site"
      style={{ '--uib-speed': '2s' } as CSSProperties}
    >
      <div className="newtons-cradle" aria-hidden="true">
        <div className="newtons-cradle__dot" />
        <div className="newtons-cradle__dot" />
        <div className="newtons-cradle__dot" />
        <div className="newtons-cradle__dot" />
      </div>
      <span>Carregando site</span>
    </div>
  );
}
