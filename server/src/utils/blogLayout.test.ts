import { describe, expect, it } from 'vitest';
import { defaultBlogLayout, normalizeBlogLayout } from './blogLayout';

describe('blogLayout', () => {
  it('returns the 3 default sections, visible, in a fixed order', () => {
    expect(defaultBlogLayout()).toEqual({
      version: 1,
      sections: [
        { type: 'featured', visible: true, title: 'Em destaque', subtitle: 'Selecionados para aparecer primeiro no blog.' },
        { type: 'mostViewed', visible: true, title: 'Mais vistos', subtitle: 'O que as leitoras estão consumindo agora.' },
        { type: 'allArticles', visible: true, title: 'Todos os artigos', subtitle: 'Artigos mais recentes, incluindo destaques e mais vistos.' }
      ]
    });
  });

  it('returns an empty section list for missing/invalid layout', () => {
    expect(normalizeBlogLayout(null)).toEqual({ version: 1, sections: [] });
    expect(normalizeBlogLayout({ foo: 'bar' })).toEqual({ version: 1, sections: [] });
  });

  it('drops sections with an unknown type', () => {
    const result = normalizeBlogLayout({
      version: 1,
      sections: [{ type: 'unknown', visible: true, title: 'x', subtitle: 'y' }]
    });
    expect(result.sections).toEqual([]);
  });

  it('drops only the invalid entry, keeping valid sections in a mixed array', () => {
    const result = normalizeBlogLayout({
      version: 1,
      sections: [
        { type: 'featured', visible: true, title: 'Keep me', subtitle: 'A' },
        { type: 'unknown', visible: true, title: 'x', subtitle: 'y' },
        { type: 'mostViewed', visible: false, title: 'Also keep me', subtitle: 'B' }
      ]
    });
    expect(result.sections).toEqual([
      { type: 'featured', visible: true, title: 'Keep me', subtitle: 'A' },
      { type: 'mostViewed', visible: false, title: 'Also keep me', subtitle: 'B' }
    ]);
  });

  it('keeps only the first occurrence of a duplicated section type', () => {
    const result = normalizeBlogLayout({
      version: 1,
      sections: [
        { type: 'featured', visible: true, title: 'Primeiro', subtitle: 'A' },
        { type: 'featured', visible: false, title: 'Segundo', subtitle: 'B' }
      ]
    });
    expect(result.sections).toEqual([{ type: 'featured', visible: true, title: 'Primeiro', subtitle: 'A' }]);
  });

  it('fills missing title/subtitle with the type default, preserves order and visibility', () => {
    const result = normalizeBlogLayout({
      version: 1,
      sections: [
        { type: 'allArticles', visible: false },
        { type: 'featured', visible: true, title: 'Custom', subtitle: '' }
      ]
    });
    expect(result.sections).toEqual([
      {
        type: 'allArticles',
        visible: false,
        title: 'Todos os artigos',
        subtitle: 'Artigos mais recentes, incluindo destaques e mais vistos.'
      },
      { type: 'featured', visible: true, title: 'Custom', subtitle: 'Selecionados para aparecer primeiro no blog.' }
    ]);
  });
});
