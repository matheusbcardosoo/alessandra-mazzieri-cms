import type { SiteSettings } from '../types';

const THEME_CACHE_KEY = 'site_theme_cache';
const THEME_CACHE_VERSION = 1;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface CachedTheme {
  version: number;
  settings: SiteSettings;
  timestamp: number;
}

export function getThemeFromCache(): SiteSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedTheme = JSON.parse(cached);

    // Validar versão
    if (parsed.version !== THEME_CACHE_VERSION) return null;

    // Validar TTL
    const age = Date.now() - parsed.timestamp;
    if (age > CACHE_TTL_MS) {
      localStorage.removeItem(THEME_CACHE_KEY);
      return null;
    }

    return parsed.settings;
  } catch {
    return null;
  }
}

export function saveThemeToCache(settings: SiteSettings): void {
  if (typeof window === 'undefined') return;
  try {
    const cached: CachedTheme = {
      version: THEME_CACHE_VERSION,
      settings,
      timestamp: Date.now()
    };
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Falha silenciosa se localStorage não disponível
  }
}

export function clearThemeCache(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(THEME_CACHE_KEY);
  } catch {
    // Falha silenciosa
  }
}
