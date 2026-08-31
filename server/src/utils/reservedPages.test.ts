import { describe, expect, it } from 'vitest';
import { isReservedPage, isReservedKeyOrSlug, RESERVED_PAGE_KEYS } from './reservedPages';

describe('reservedPages', () => {
  it('lists home and blog as reserved', () => {
    expect(RESERVED_PAGE_KEYS).toEqual(['home', 'blog']);
  });

  it('treats a page as reserved when its pageKey matches', () => {
    expect(isReservedPage({ pageKey: 'blog', slug: 'blog' })).toBe(true);
    expect(isReservedPage({ pageKey: 'home', slug: 'inicio' })).toBe(true);
  });

  it('treats a page as reserved when only its slug matches', () => {
    expect(isReservedPage({ pageKey: null, slug: 'blog' })).toBe(true);
  });

  it('treats a regular page as not reserved', () => {
    expect(isReservedPage({ pageKey: null, slug: 'sobre' })).toBe(false);
  });

  it('checks a bare key or slug string', () => {
    expect(isReservedKeyOrSlug('blog')).toBe(true);
    expect(isReservedKeyOrSlug('sobre')).toBe(false);
    expect(isReservedKeyOrSlug(undefined)).toBe(false);
  });
});
