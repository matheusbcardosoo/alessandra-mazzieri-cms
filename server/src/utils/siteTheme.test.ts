import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE_THEME, normalizeSiteTheme } from './siteTheme';

describe('server siteTheme', () => {
  it('returns the default theme when stored data is missing', () => {
    expect(normalizeSiteTheme(null)).toEqual({
      ...DEFAULT_SITE_THEME,
      typography: {
        headingFont: null,
        bodyFont: null
      }
    });
  });

  it('normalizes valid stored theme data', () => {
    expect(
      normalizeSiteTheme({
        preset: 'vinho-suave',
        colors: {
          background: '#fff7f8',
          text: '#331822',
          primary: '#8a3651',
          accent: '#c9798d'
        }
      })
    ).toEqual({
      preset: 'vinho-suave',
      colors: {
        background: '#fff7f8',
        text: '#331822',
        primary: '#8a3651',
        accent: '#c9798d'
      },
      typography: {
        headingFont: null,
        bodyFont: null
      },
      elements: {
        blog: { titleColor: null, subtitleColor: null, gradientStart: null, gradientEnd: null },
        blogPage: { titleColor: null, subtitleColor: null, gradientStart: null, gradientEnd: null }
      }
    });
  });

  it('replaces invalid color values with preset defaults', () => {
    const theme = normalizeSiteTheme({
      preset: 'sereno-azul',
      colors: {
        background: '#f2f7fb',
        text: 'blue',
        primary: '#2f638f',
        accent: '#12345'
      }
    });

    expect(theme.colors.background).toBe('#f2f7fb');
    expect(theme.colors.text).toBe('#172636');
    expect(theme.colors.primary).toBe('#2f638f');
    expect(theme.colors.accent).toBe('#78a6c8');
  });
});
