import type { SiteTheme, SiteThemeColors, SiteThemeElements, SiteThemePreset, SiteTypography } from '@/types';

export type SiteThemeCssVars = Record<string, string>;

export const SITE_THEME_PRESETS: Record<SiteThemePreset, SiteTheme> = {
  neutro: {
    preset: 'neutro',
    colors: {
      background: '#f8fafc',
      text: '#1e293b',
      primary: '#334155',
      accent: '#64748b'
    }
  },
  'terra-oliva': {
    preset: 'terra-oliva',
    colors: {
      background: '#f9f4ec',
      text: '#1f2d16',
      primary: '#8d2b00',
      accent: '#be6731'
    }
  },
  'sereno-azul': {
    preset: 'sereno-azul',
    colors: {
      background: '#f2f7fb',
      text: '#172636',
      primary: '#2f638f',
      accent: '#78a6c8'
    }
  },
  salvia: {
    preset: 'salvia',
    colors: {
      background: '#f4f7ef',
      text: '#1e2b1c',
      primary: '#5f7c58',
      accent: '#b68b5f'
    }
  },
  'vinho-suave': {
    preset: 'vinho-suave',
    colors: {
      background: '#fff7f8',
      text: '#331822',
      primary: '#8a3651',
      accent: '#c9798d'
    }
  }
};

const DEFAULT_THEME_ELEMENT: SiteThemeElements['blog'] = {
  titleColor: null,
  subtitleColor: null,
  gradientStart: null,
  gradientEnd: null
};

export const DEFAULT_SITE_THEME: SiteTheme = {
  ...SITE_THEME_PRESETS['neutro'],
  typography: { headingFont: null, bodyFont: null },
  elements: {
    blog: DEFAULT_THEME_ELEMENT,
    blogPage: DEFAULT_THEME_ELEMENT
  }
};

const presetKeys = Object.keys(SITE_THEME_PRESETS) as SiteThemePreset[];
const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

export function isSiteThemePreset(value: unknown): value is SiteThemePreset {
  return typeof value === 'string' && presetKeys.includes(value as SiteThemePreset);
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && hexColorPattern.test(value);
}

export function isTypographyObject(value: unknown): value is Partial<SiteTypography> {
  return typeof value === 'object' && value !== null;
}

function isThemeObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeSiteTheme(value?: Partial<SiteTheme> | null): SiteTheme {
  const preset = isSiteThemePreset(value?.preset) ? value.preset : DEFAULT_SITE_THEME.preset;
  const presetTheme = SITE_THEME_PRESETS[preset];
  const colors: Partial<SiteThemeColors> = value?.colors ?? {};

  // Normalize typography
  const rawTypography: Partial<SiteTypography> = isTypographyObject(value?.typography) ? value.typography : {};
  const headingFont = typeof rawTypography.headingFont === 'string' && rawTypography.headingFont.trim()
    ? rawTypography.headingFont.trim()
    : null;
  const bodyFont = typeof rawTypography.bodyFont === 'string' && rawTypography.bodyFont.trim()
    ? rawTypography.bodyFont.trim()
    : null;

  // Normalize element-level color overrides (ex.: título/subtítulo/linha da Home vs. da página /blog)
  const rawElements = isThemeObject(value?.elements) ? (value!.elements as Record<string, unknown>) : {};

  return {
    preset,
    colors: {
      background: isHexColor(colors.background) ? colors.background : presetTheme.colors.background,
      text: isHexColor(colors.text) ? colors.text : presetTheme.colors.text,
      primary: isHexColor(colors.primary) ? colors.primary : presetTheme.colors.primary,
      accent: isHexColor(colors.accent) ? colors.accent : presetTheme.colors.accent
    },
    typography: { headingFont, bodyFont },
    elements: {
      blog: normalizeBlogElement(rawElements.blog),
      blogPage: normalizeBlogElement(rawElements.blogPage)
    }
  };
}

function normalizeBlogElement(value: unknown): SiteThemeElements['blog'] {
  const raw = isThemeObject(value) ? value : {};
  return {
    titleColor: isHexColor(raw.titleColor) ? (raw.titleColor as string) : null,
    subtitleColor: isHexColor(raw.subtitleColor) ? (raw.subtitleColor as string) : null,
    gradientStart: isHexColor(raw.gradientStart) ? (raw.gradientStart as string) : null,
    gradientEnd: isHexColor(raw.gradientEnd) ? (raw.gradientEnd as string) : null
  };
}

export function siteThemeToCssVars(themeInput?: Partial<SiteTheme> | null): SiteThemeCssVars {
  const theme = normalizeSiteTheme(themeInput);
  const { background, text, primary, accent } = theme.colors;
  const { typography, elements } = theme;

  return {
    '--theme-background-rgb': hexToRgb(background),
    '--theme-text-rgb': hexToRgb(text),
    '--theme-primary-rgb': hexToRgb(primary),
    '--theme-accent-rgb': hexToRgb(accent),
    '--color-paper': background,
    '--color-shell': tintColor(background, '#ffffff', 0.4),
    '--color-surface': tintColor(background, '#ffffff', 0.72),
    '--color-deep': text,
    '--color-forest': tintColor(text, '#ffffff', 0.22),
    '--color-olive': tintColor(text, accent, 0.45),
    '--color-terracotta': primary,
    '--color-terracotta-strong': shadeColor(primary, '#000000', 0.14),
    '--color-clay': accent,
    '--color-burnt': primary,
    '--color-rust': shadeColor(primary, '#000000', 0.14),
    '--color-amber': accent,
    '--brand-text-color': accent,
    '--section-bg': tintColor(background, '#ffffff', 0.34),
    '--section-fg': text,
    '--section-border': hexToRgba(primary, 0.18),
    '--section-surface': tintColor(background, '#ffffff', 0.82),
    '--section-surface-soft': hexToRgba(background, 0.75),
    '--font-heading': typography?.headingFont
      ? `'${typography.headingFont}', Georgia, serif`
      : 'var(--font-serif, Georgia, serif)',
    '--font-body': typography?.bodyFont
      ? `'${typography.bodyFont}', system-ui, sans-serif`
      : 'var(--font-sans, system-ui, sans-serif)',
    // Overrides isolados por elemento (Configurações > Elementos). Só entram no
    // objeto (e portanto no CSS) quando definidos — do contrário o var(--x, fallback)
    // no CSS continua caindo no valor derivado do tema.
    ...elementCssVars('--blog', elements?.blog),
    ...elementCssVars('--blog-page', elements?.blogPage)
  };
}

function elementCssVars(prefix: string, element?: SiteThemeElements['blog']): SiteThemeCssVars {
  if (!element) return {};
  const vars: SiteThemeCssVars = {};
  if (element.titleColor) vars[`${prefix}-title-color`] = element.titleColor;
  if (element.subtitleColor) vars[`${prefix}-subtitle-color`] = element.subtitleColor;
  if (element.gradientStart) vars[`${prefix}-gradient-start`] = element.gradientStart;
  if (element.gradientEnd) vars[`${prefix}-gradient-end`] = element.gradientEnd;
  return vars;
}

export function getPresetTheme(preset: SiteThemePreset): SiteTheme {
  return SITE_THEME_PRESETS[preset];
}

/** Cores que a Home e a página /blog usam quando não há override salvo
 *  (mesma derivação de --color-deep/--color-forest/--color-clay em siteThemeToCssVars).
 *  Vale para os dois grupos (blog / blogPage) — a derivação parte só de theme.colors,
 *  não do grupo em si. Usado para pré-preencher o color picker ao ligar "Personalizado". */
export function getDerivedElementColors(theme: SiteTheme): SiteThemeElements['blog'] {
  const { text, accent } = theme.colors;
  const forest = tintColor(text, '#ffffff', 0.22);
  return {
    titleColor: text,
    subtitleColor: forest,
    gradientStart: forest,
    gradientEnd: accent
  };
}

export function updateSiteThemeColor(theme: SiteTheme, key: keyof SiteThemeColors, value: string): SiteTheme {
  return normalizeSiteTheme({
    ...theme,
    colors: {
      ...theme.colors,
      [key]: value
    }
  });
}

export function updateSiteThemeElementColor(
  theme: SiteTheme,
  group: keyof SiteThemeElements,
  key: keyof SiteThemeElements['blog'],
  value: string | null
): SiteTheme {
  const elements: SiteThemeElements = theme.elements ?? {
    blog: { titleColor: null, subtitleColor: null, gradientStart: null, gradientEnd: null },
    blogPage: { titleColor: null, subtitleColor: null, gradientStart: null, gradientEnd: null }
  };
  const nextElements: SiteThemeElements = {
    ...elements,
    [group]: { ...elements[group], [key]: value }
  };
  return normalizeSiteTheme({ ...theme, elements: nextElements });
}

function tintColor(from: string, to: string, amount: number): string {
  return mixHex(from, to, amount);
}

function shadeColor(from: string, to: string, amount: number): string {
  return mixHex(from, to, amount);
}

function mixHex(from: string, to: string, amount: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  const mix = (start: number, end: number) => Math.round(start + (end - start) * amount);
  return toHex(mix(a.r, b.r), mix(a.g, b.g), mix(a.b, b.b));
}

function hexToRgba(hex: string, alpha: number): string {
  const color = parseHex(hex);
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function hexToRgb(hex: string): string {
  const color = parseHex(hex);
  return `${color.r}, ${color.g}, ${color.b}`;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const normalized = isHexColor(hex) ? hex.slice(1) : '000000';
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}
