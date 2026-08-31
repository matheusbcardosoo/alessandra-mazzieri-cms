export const RESERVED_PAGE_KEYS = ['home', 'blog'] as const;
export type ReservedPageKey = (typeof RESERVED_PAGE_KEYS)[number];

export function isReservedPage(page: { pageKey?: string | null; slug?: string | null }): boolean {
  return RESERVED_PAGE_KEYS.some((key) => page.pageKey === key || page.slug === key);
}

export function isReservedKeyOrSlug(value?: string | null): boolean {
  return RESERVED_PAGE_KEYS.some((key) => value === key);
}
