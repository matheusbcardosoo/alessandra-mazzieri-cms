import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE_THEME, normalizeSiteTheme, siteThemeToCssVars } from './siteTheme';

describe('siteTheme', () => {
  it('uses the default theme when no theme is provided', () => {
    expect(normalizeSiteTheme()).toEqual(DEFAULT_SITE_THEME);
  });

  it('keeps valid color overrides for the selected preset', () => {
    const theme = normalizeSiteTheme({
      preset: 'sereno-azul',
      colors: {
        background: '#f5fbff',
        text: '#102030',
        primary: '#235c9f',
        accent: '#7a9cc6'
      }
    });

    expect(theme).toEqual({
      preset: 'sereno-azul',
      colors: {
        background: '#f5fbff',
        text: '#102030',
        primary: '#235c9f',
        accent: '#7a9cc6'
      },
      typography: { headingFont: null, bodyFont: null },
      elements: {
        blog: { titleColor: null, subtitleColor: null, gradientStart: null, gradientEnd: null },
        blogPage: { titleColor: null, subtitleColor: null, gradientStart: null, gradientEnd: null }
      }
    });
  });

  it('falls back invalid colors to the chosen preset colors', () => {
    const theme = normalizeSiteTheme({
      preset: 'salvia',
      colors: {
        background: 'green',
        text: '#223344',
        primary: '#12345',
        accent: '#abcdef'
      }
    });

    expect(theme.colors.background).toBe('#f4f7ef');
    expect(theme.colors.text).toBe('#223344');
    expect(theme.colors.primary).toBe('#5f7c58');
    expect(theme.colors.accent).toBe('#abcdef');
  });

  it('maps theme colors to public CSS variables', () => {
    const vars = siteThemeToCssVars({
      preset: 'terra-oliva',
      colors: {
        background: '#f9f4ec',
        text: '#1f2d16',
        primary: '#8d2b00',
        accent: '#be6731'
      }
    });

    expect(vars['--color-paper']).toBe('#f9f4ec');
    expect(vars['--color-deep']).toBe('#1f2d16');
    expect(vars['--color-terracotta']).toBe('#8d2b00');
    expect(vars['--color-clay']).toBe('#be6731');
  });
});
