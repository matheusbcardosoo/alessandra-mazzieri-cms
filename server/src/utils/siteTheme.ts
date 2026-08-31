export const siteThemePresetValues = ['terra-oliva', 'sereno-azul', 'salvia', 'vinho-suave'] as const;

export type SiteThemePreset = (typeof siteThemePresetValues)[number];

export type SiteThemeColors = {
  background: string;
  text: string;
  primary: string;
  accent: string;
};

export type SiteTypography = {
  headingFont: string | null;
  bodyFont: string | null;
};

export type SiteThemeBlogElement = {
  titleColor: string | null;
  subtitleColor: string | null;
  gradientStart: string | null;
  gradientEnd: string | null;
};

export type SiteThemeElements = {
  /** Bloco "Conteúdos recentes" exibido na Home */
  blog: SiteThemeBlogElement;
  /** Página /blog (cabeçalho + "Em destaque" + "Mais vistos" + "Todos os artigos") */
  blogPage: SiteThemeBlogElement;
};

export type SiteTheme = {
  preset: SiteThemePreset;
  colors: SiteThemeColors;
  typography?: SiteTypography;
  elements?: SiteThemeElements;
};

export const SITE_THEME_PRESETS: Record<SiteThemePreset, SiteTheme> = {
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

const DEFAULT_THEME_ELEMENT: SiteThemeBlogElement = {
  titleColor: null,
  subtitleColor: null,
  gradientStart: null,
  gradientEnd: null
};

export const DEFAULT_SITE_THEME: SiteTheme = {
  ...SITE_THEME_PRESETS['terra-oliva'],
  elements: {
    blog: DEFAULT_THEME_ELEMENT,
    blogPage: DEFAULT_THEME_ELEMENT
  }
};

const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

export function isSiteThemePreset(value: unknown): value is SiteThemePreset {
  return typeof value === 'string' && siteThemePresetValues.includes(value as SiteThemePreset);
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && hexColorPattern.test(value);
}

export function isTypographyObject(value: unknown): value is Partial<SiteTypography> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeSiteTheme(value?: unknown): SiteTheme {
  const raw = isThemeObject(value) ? value : {};
  const preset = isSiteThemePreset(raw.preset) ? raw.preset : DEFAULT_SITE_THEME.preset;
  const presetTheme = SITE_THEME_PRESETS[preset];
  const colors = isThemeObject(raw.colors) ? raw.colors : {};

  // Normalize typography
  const rawTypography = isTypographyObject(raw.typography) ? raw.typography : {};
  const headingFont = typeof rawTypography.headingFont === 'string' && rawTypography.headingFont.trim()
    ? rawTypography.headingFont.trim()
    : null;
  const bodyFont = typeof rawTypography.bodyFont === 'string' && rawTypography.bodyFont.trim()
    ? rawTypography.bodyFont.trim()
    : null;

  // Normalize element-level color overrides
  const rawElements = isThemeObject(raw.elements) ? raw.elements : {};

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

function normalizeBlogElement(value: unknown): SiteThemeBlogElement {
  const raw = isThemeObject(value) ? value : {};
  return {
    titleColor: isHexColor(raw.titleColor) ? raw.titleColor : null,
    subtitleColor: isHexColor(raw.subtitleColor) ? raw.subtitleColor : null,
    gradientStart: isHexColor(raw.gradientStart) ? raw.gradientStart : null,
    gradientEnd: isHexColor(raw.gradientEnd) ? raw.gradientEnd : null
  };
}

function isThemeObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
