# Blog Page Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public `/blog` page editable from the admin — the header text, and the presence/order/visibility/title of its three listing sections (Em destaque, Mais vistos, Todos os artigos) — without opening it up to the generic block page-builder.

**Architecture:** Reserve `pageKey: 'blog'` on the existing `Page` table (same trick already used for `'home'`). `Page.title`/`Page.description` hold the header text; `Page.layout` holds a small blog-specific JSON (`{version, sections: [{type, visible, title, subtitle}]}` — 3 fixed `type`s, at most one each) validated by a new `blogLayout.ts` util, served by a new `BlogService` mirroring `HomeService`. A dedicated (non-page-builder) `AdminBlogPage.tsx` edits it; the public `BlogPage.tsx` renders sections in the configured order, and forces the "Todos os artigos" list to appear (with a default title if the section was removed) whenever a search is active.

**Tech Stack:** Express 5 + TypeScript + Prisma + zod (server), React 19 + TypeScript + React Query + Axios (client), Vitest on both sides.

**Spec:** `docs/superpowers/specs/2026-08-23-blog-page-editor-design.md`

## Global Constraints

- No Prisma schema migration — reuse the existing `Page` table via reserved `pageKey: 'blog'`.
- Exactly 3 section types, each usable at most once: `featured`, `mostViewed`, `allArticles`. Order in the stored array = display order.
- Header (title + description + search box) is always rendered first and is never part of the reorderable section list.
- The search box is always visible. While a search term is active, only the "Todos os artigos" list is shown (all other sections hidden), using the `allArticles` section's configured title/subtitle if present in the config (even hidden) or a hardcoded default otherwise.
- No `window.confirm`/`window.prompt` — use `ConfirmModal` from `components/AdminUI.tsx`.
- TypeScript strict, no unexplained `any`.
- Follow existing conventions exactly: `toast` from `@/components/Toast`, `sendSuccess`/`HttpError`/`idParamSchema` on the server, cache via `cacheProvider`/`cacheKeys`/`cacheTTL`.

---

## Task 1: Reserved-page-keys helper + generalize the `'home'`-only guards

Today `'home'` is hardcoded as a reserved `pageKey`/`slug` in ~6 places across `page.repository.ts` and `page.service.ts`. Adding `'blog'` as a second reserved key the same way would double that duplication, so this task extracts a small shared helper first and reuses it at every site that currently special-cases `'home'` only.

**Files:**
- Create: `server/src/utils/reservedPages.ts`
- Test: `server/src/utils/reservedPages.test.ts`
- Modify: `server/src/repositories/page.repository.ts`
- Modify: `server/src/services/page.service.ts`

**Interfaces:**
- Produces: `RESERVED_PAGE_KEYS: readonly ['home', 'blog']`, `isReservedPage(page: {pageKey?: string|null; slug?: string|null}): boolean`, `isReservedKeyOrSlug(value?: string|null): boolean` — used by Task 5 and by `blog.service.ts` is NOT required to import this (it checks its own single key directly, see Task 3).

- [ ] **Step 1: Write the failing test**

Create `server/src/utils/reservedPages.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/utils/reservedPages.test.ts`
Expected: FAIL — cannot find module `./reservedPages`

- [ ] **Step 3: Write the implementation**

Create `server/src/utils/reservedPages.ts`:

```ts
export const RESERVED_PAGE_KEYS = ['home', 'blog'] as const;
export type ReservedPageKey = (typeof RESERVED_PAGE_KEYS)[number];

export function isReservedPage(page: { pageKey?: string | null; slug?: string | null }): boolean {
  return RESERVED_PAGE_KEYS.some((key) => page.pageKey === key || page.slug === key);
}

export function isReservedKeyOrSlug(value?: string | null): boolean {
  return RESERVED_PAGE_KEYS.some((key) => value === key);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/utils/reservedPages.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Generalize `page.repository.ts`**

In `server/src/repositories/page.repository.ts`, add the import and replace `findAllPublished`/`findAll`:

```ts
import { Prisma, Page } from '@prisma/client';
import { prisma } from '../config/prisma';
import { RESERVED_PAGE_KEYS } from '../utils/reservedPages';
```

Replace:

```ts
  // Todas as páginas publicadas (exceto a home, que vive na rota "/" e não
  // tem URL própria de página) — usado para gerar sitemap.xml/llms.txt
  // (Fase 4, docs/plano-template.md).
  findAllPublished(): Promise<Page[]> {
    return prisma.page.findMany({
      where: {
        status: 'published',
        OR: [{ pageKey: null }, { pageKey: { not: 'home' } }]
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  findAll(options?: { excludePageKey?: string; excludeSlug?: string }): Promise<Page[]> {
    const filters: Prisma.PageWhereInput[] = [];

    // Filtro para pageKey: exclui APENAS se for igual ao valor especificado (NULL é diferente)
    if (options?.excludePageKey) {
      filters.push({
        OR: [
          { pageKey: null },
          { pageKey: { not: options.excludePageKey } }
        ]
      });
    }

    // Filtro para slug: exclui se for igual ao valor especificado
    if (options?.excludeSlug) {
      filters.push({ slug: { not: options.excludeSlug } });
    }

    const where: Prisma.PageWhereInput | undefined = filters.length ? { AND: filters } : undefined;

    return prisma.page.findMany({ where, orderBy: { updatedAt: 'desc' } });
  }
```

with:

```ts
  // Todas as páginas publicadas, exceto as páginas reservadas do sistema
  // (home, blog — cada uma vive na sua própria rota fixa e não tem URL de
  // página genérica) — usado para gerar sitemap.xml/llms.txt (Fase 4,
  // docs/plano-template.md).
  findAllPublished(): Promise<Page[]> {
    return prisma.page.findMany({
      where: {
        status: 'published',
        OR: [{ pageKey: null }, { pageKey: { notIn: [...RESERVED_PAGE_KEYS] } }]
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  findAll(options?: { excludePageKeys?: string[]; excludeSlugs?: string[] }): Promise<Page[]> {
    const filters: Prisma.PageWhereInput[] = [];

    // Filtro para pageKey: exclui se for igual a QUALQUER um dos valores especificados (NULL é diferente)
    if (options?.excludePageKeys?.length) {
      filters.push({
        OR: [
          { pageKey: null },
          { pageKey: { notIn: options.excludePageKeys } }
        ]
      });
    }

    // Filtro para slug: exclui se for igual a QUALQUER um dos valores especificados
    if (options?.excludeSlugs?.length) {
      filters.push({ slug: { notIn: options.excludeSlugs } });
    }

    const where: Prisma.PageWhereInput | undefined = filters.length ? { AND: filters } : undefined;

    return prisma.page.findMany({ where, orderBy: { updatedAt: 'desc' } });
  }
```

- [ ] **Step 6: Generalize `page.service.ts`**

In `server/src/services/page.service.ts`, add the import:

```ts
import { isReservedPage, isReservedKeyOrSlug, RESERVED_PAGE_KEYS } from '../utils/reservedPages';
```

Replace the body of `getPublishedBySlug`:

```ts
  async getPublishedBySlug(slug: string): Promise<Page> {
    if (isReservedKeyOrSlug(slug)) throw new HttpError(404, 'Page not found');
    return cacheProvider.wrap(cacheKeys.page(slug), cacheTTL.page, async () => {
      const page = await repository.findPublishedBySlug(slug);
      if (!page || isReservedKeyOrSlug(page.pageKey)) throw new HttpError(404, 'Page not found');
      return page;
    });
  }
```

Replace the body of `getPublishedByKey`:

```ts
  async getPublishedByKey(pageKey: string): Promise<Page> {
    if (isReservedKeyOrSlug(pageKey)) throw new HttpError(404, 'Page not found');
    const page = await repository.findPublishedByPageKey(pageKey);
    if (!page) throw new HttpError(404, 'Page not found');
    return page;
  }
```

Replace `listAdmin`:

```ts
  async listAdmin(includeHome = false): Promise<Page[]> {
    if (includeHome) {
      return repository.findAll();
    }
    return repository.findAll({ excludePageKeys: [...RESERVED_PAGE_KEYS], excludeSlugs: [...RESERVED_PAGE_KEYS] });
  }
```

In `create`, replace:

```ts
    if (pageKey === 'home' || slug === 'home') {
      throw new HttpError(400, 'Use o endpoint dedicado para criar/editar a home.');
    }
```

with:

```ts
    if (isReservedKeyOrSlug(pageKey) || isReservedKeyOrSlug(slug)) {
      throw new HttpError(400, 'Este slug/pageKey é reservado pelo sistema. Use o endpoint dedicado.');
    }
```

In `update`, replace:

```ts
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Page not found');
    const isHome = existing.pageKey === 'home' || existing.slug === 'home';
```

with:

```ts
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Page not found');
    const isReserved = isReservedPage(existing);
```

and replace:

```ts
    const slug = payload.slug ? payload.slug.trim().toLowerCase() : undefined;
    if (slug === 'home' || (isHome && slug && slug !== 'home')) {
      throw new HttpError(400, 'Slug da home não pode ser alterado por este endpoint');
    }
```

with:

```ts
    const slug = payload.slug ? payload.slug.trim().toLowerCase() : undefined;
    if (isReservedKeyOrSlug(slug)) {
      throw new HttpError(400, 'Este slug é reservado pelo sistema.');
    }
    if (isReserved && slug && slug !== existing.slug) {
      throw new HttpError(400, 'O slug desta página reservada não pode ser alterado por este endpoint.');
    }
```

In `delete`, replace:

```ts
    if (existing.pageKey === 'home' || existing.slug === 'home') {
      throw new HttpError(400, 'Home page cannot be removed');
    }
```

with:

```ts
    if (isReservedPage(existing)) {
      throw new HttpError(400, 'Esta página é reservada pelo sistema e não pode ser removida.');
    }
```

In `publish`, replace:

```ts
    if (existing.pageKey === 'home' || existing.slug === 'home') {
      throw new HttpError(400, 'Home page is always published');
    }
```

with:

```ts
    if (isReservedPage(existing)) {
      throw new HttpError(400, 'Esta página é reservada pelo sistema e é sempre publicada automaticamente.');
    }
```

In `unpublish`, replace:

```ts
    if (existing.pageKey === 'home' || existing.slug === 'home') {
      throw new HttpError(400, 'Home page cannot be unpublished');
    }
```

with:

```ts
    if (isReservedPage(existing)) {
      throw new HttpError(400, 'Esta página é reservada pelo sistema e não pode ser despublicada.');
    }
```

In the private `syncCache`, replace:

```ts
    if (page.status === PageStatus.published && page.pageKey !== 'home') {
```

with:

```ts
    if (page.status === PageStatus.published && !isReservedPage(page)) {
```

- [ ] **Step 7: Run the full server test suite**

Run: `cd server && npx vitest run`
Expected: PASS (all existing tests still pass — this task only generalizes literals, no behavior change for `'home'`)

- [ ] **Step 8: Commit**

```bash
git add server/src/utils/reservedPages.ts server/src/utils/reservedPages.test.ts server/src/repositories/page.repository.ts server/src/services/page.service.ts
git commit -m "refactor: generalize home-only reserved-page guards to a shared helper"
```

---

## Task 2: `blogLayout.ts` — normalize/validate the blog's section config

**Files:**
- Create: `server/src/utils/blogLayout.ts`
- Test: `server/src/utils/blogLayout.test.ts`

**Interfaces:**
- Produces: `BLOG_SECTION_TYPES: readonly ['featured','mostViewed','allArticles']`, `type BlogSectionType`, `type BlogSection = {type; visible; title; subtitle}`, `type BlogLayout = {version:1; sections: BlogSection[]}`, `normalizeBlogLayout(layout: unknown): BlogLayout`, `defaultBlogLayout(): BlogLayout` — consumed by Task 3 (`blog.service.ts`) and Task 5 (`blog.controller.ts`, for the zod enum).

- [ ] **Step 1: Write the failing test**

Create `server/src/utils/blogLayout.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/utils/blogLayout.test.ts`
Expected: FAIL — cannot find module `./blogLayout`

- [ ] **Step 3: Write the implementation**

Create `server/src/utils/blogLayout.ts`:

```ts
import { z } from 'zod';

export const BLOG_SECTION_TYPES = ['featured', 'mostViewed', 'allArticles'] as const;
export type BlogSectionType = (typeof BLOG_SECTION_TYPES)[number];

export type BlogSection = {
  type: BlogSectionType;
  visible: boolean;
  title: string;
  subtitle: string;
};

export type BlogLayout = {
  version: 1;
  sections: BlogSection[];
};

const DEFAULT_SECTION_TEXT: Record<BlogSectionType, { title: string; subtitle: string }> = {
  featured: {
    title: 'Em destaque',
    subtitle: 'Selecionados para aparecer primeiro no blog.'
  },
  mostViewed: {
    title: 'Mais vistos',
    subtitle: 'O que as leitoras estão consumindo agora.'
  },
  allArticles: {
    title: 'Todos os artigos',
    subtitle: 'Artigos mais recentes, incluindo destaques e mais vistos.'
  }
};

const blogSectionSchema = z.object({
  type: z.enum(BLOG_SECTION_TYPES),
  visible: z.boolean().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional()
});

// `sections` is validated per-entry inside normalizeBlogLayout (not with
// z.array(blogSectionSchema) here), so one malformed entry only drops
// itself — not the whole array. zod's array parsing is all-or-nothing,
// which would otherwise wipe every valid, admin-customized section
// whenever a single stored entry fails validation.
const blogLayoutSchema = z.object({
  version: z.literal(1).optional(),
  sections: z.array(z.unknown()).optional()
});

/**
 * Normaliza o JSON de layout do blog: valida tipos permitidos, remove
 * duplicatas (mantendo a primeira ocorrência de cada tipo) e preenche
 * título/subtítulo ausentes com o texto default daquele tipo. Cada seção é
 * validada individualmente — uma entrada inválida é descartada sozinha,
 * sem derrubar as demais.
 */
export function normalizeBlogLayout(layout: unknown): BlogLayout {
  const parsed = blogLayoutSchema.safeParse(layout);
  const rawSections = parsed.success ? (parsed.data.sections ?? []) : [];

  const seen = new Set<BlogSectionType>();
  const sections: BlogSection[] = [];
  for (const rawItem of rawSections) {
    const itemParsed = blogSectionSchema.safeParse(rawItem);
    if (!itemParsed.success) continue;
    const raw = itemParsed.data;
    if (seen.has(raw.type)) continue;
    seen.add(raw.type);
    const defaults = DEFAULT_SECTION_TEXT[raw.type];
    sections.push({
      type: raw.type,
      visible: raw.visible ?? true,
      title: raw.title?.trim() || defaults.title,
      subtitle: raw.subtitle?.trim() || defaults.subtitle
    });
  }

  return { version: 1, sections };
}

/** Layout usado na primeira criação da página reservada do blog. */
export function defaultBlogLayout(): BlogLayout {
  return {
    version: 1,
    sections: BLOG_SECTION_TYPES.map((type) => ({
      type,
      visible: true,
      ...DEFAULT_SECTION_TEXT[type]
    }))
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/utils/blogLayout.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/blogLayout.ts server/src/utils/blogLayout.test.ts
git commit -m "feat: add blog layout normalization util"
```

---

## Task 3: `BlogService` — reserved blog page, cached public config, admin update

**Files:**
- Modify: `server/src/config/env.ts`
- Modify: `server/.env.example`
- Modify: `server/src/config/cache.ts`
- Create: `server/src/services/blog.service.ts`
- Test: `server/src/services/blog.service.test.ts`

**Interfaces:**
- Consumes: `normalizeBlogLayout`, `defaultBlogLayout`, `BlogSection` from `../utils/blogLayout` (Task 2); `cacheKeys.blog`, `cacheTTL.blog`, `cacheProvider` from `../config/cache`; `PageRepository` from `../repositories/page.repository`.
- Produces: `class BlogService` with `ensureBlog(): Promise<Page>`, `getAdmin(): Promise<BlogAdminConfig>`, `getPublic(): Promise<BlogPublicConfig>`, `updateBlog(id, payload): Promise<BlogAdminConfig>`; `type BlogAdminConfig = {id; title; description; sections: BlogSection[]}`; `type BlogPublicConfig = Omit<BlogAdminConfig, 'id'>`. Consumed by Task 4 (public composition) and Task 5 (admin controller).

- [ ] **Step 1: Add the cache TTL config (prerequisite, no test — plain config)**

In `server/src/config/env.ts`, add right after `CACHE_TTL_HOME`:

```ts
  CACHE_TTL_HOME: z.coerce.number().default(3600),
  CACHE_TTL_BLOG: z.coerce.number().default(3600),
```

In `server/.env.example`, add right after `CACHE_TTL_HOME=3600`:

```
CACHE_TTL_HOME=3600
CACHE_TTL_BLOG=3600
```

In `server/src/config/cache.ts`, add `blog` to both `cacheTTL` and `cacheKeys`:

```ts
export const cacheTTL = {
  nav: env.CACHE_TTL_NAV,
  home: env.CACHE_TTL_HOME,
  blog: env.CACHE_TTL_BLOG,
  page: env.CACHE_TTL_PAGE,
  post: env.CACHE_TTL_POST,
  postsList: env.CACHE_TTL_POSTS_LIST,
  featuredPosts: env.CACHE_TTL_POSTS_LIST,
  mostViewedPosts: env.CACHE_TTL_POSTS_LIST,
  siteSettings: 3600,
  blogHome: 120,
  sitemap: env.CACHE_TTL_PAGE,
  llmsTxt: env.CACHE_TTL_PAGE
};

export const cacheKeys = {
  nav: 'nav:public',
  home: 'home:public',
  blog: 'blog:public',
  siteSettings: 'site-settings:public',
  blogHome: 'posts:blog-home',
  postsList: 'posts:list:published',
  postsFeatured: 'posts:list:featured',
  postsMostViewed: 'posts:list:most-viewed',
  post: (slug: string) => `post:public:${slug}`,
  page: (slug: string) => `page:public:${slug}`,
  sitemap: 'seo:sitemap',
  llmsTxt: 'seo:llms-txt'
};
```

- [ ] **Step 2: Write the failing test**

Create `server/src/services/blog.service.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

type FakePage = {
  id: string;
  slug: string;
  pageKey: string | null;
  title: string;
  description: string | null;
  layout: unknown;
  status: 'draft' | 'published';
  publishedAt: Date | null;
};

const mockRepo = {
  findBySlugOrKey: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn()
};

vi.mock('../repositories/page.repository', () => ({
  PageRepository: vi.fn().mockImplementation(() => mockRepo)
}));

const cacheStore = new Map<string, unknown>();

vi.mock('../config/cache', () => ({
  cacheProvider: {
    get: vi.fn(async (key: string) => cacheStore.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      cacheStore.set(key, value);
    }),
    del: vi.fn(async (key: string | string[]) => {
      (Array.isArray(key) ? key : [key]).forEach((k) => cacheStore.delete(k));
    }),
    wrap: vi.fn(async (key: string, _ttl: number, fn: () => Promise<unknown>) => {
      if (cacheStore.has(key)) return cacheStore.get(key);
      const value = await fn();
      cacheStore.set(key, value);
      return value;
    })
  },
  cacheKeys: { blog: 'blog:public' },
  cacheTTL: { blog: 3600 }
}));

import { BlogService } from './blog.service';

function makePage(overrides: Partial<FakePage> = {}): FakePage {
  return {
    id: 'blog-id',
    slug: 'blog',
    pageKey: 'blog',
    title: 'Jornadas e reflexões',
    description: 'Leituras rápidas, aplicáveis e cuidadosas.',
    layout: { version: 1, sections: [] },
    status: 'published',
    publishedAt: new Date('2026-01-01'),
    ...overrides
  };
}

describe('BlogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheStore.clear();
  });

  it('creates the reserved blog page with the 3 default sections on first access', async () => {
    mockRepo.findBySlugOrKey.mockResolvedValue(null);
    mockRepo.create.mockImplementation(async (data: any) => makePage({ layout: data.layout }));

    const service = new BlogService();
    const config = await service.getAdmin();

    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'blog', pageKey: 'blog' }));
    expect(config.sections.map((s) => s.type)).toEqual(['featured', 'mostViewed', 'allArticles']);
    expect(config.sections.every((s) => s.visible)).toBe(true);
  });

  it('reuses the existing blog page without creating a new one', async () => {
    mockRepo.findBySlugOrKey.mockResolvedValue(makePage());

    const service = new BlogService();
    await service.getAdmin();

    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('rejects updates for an id that is not the reserved blog page', async () => {
    mockRepo.findById.mockResolvedValue(makePage({ pageKey: null, slug: 'sobre' }));

    const service = new BlogService();
    await expect(service.updateBlog('other-id', { title: 'x' })).rejects.toMatchObject({ status: 404 });
  });

  it('updates title, description and sections, and republishes the cache', async () => {
    const existing = makePage();
    mockRepo.findById.mockResolvedValue(existing);
    mockRepo.update.mockImplementation(async (_id: string, data: any) => ({ ...existing, ...data }));

    const service = new BlogService();
    const result = await service.updateBlog('blog-id', {
      title: 'Novo título',
      description: 'Nova descrição',
      sections: [{ type: 'mostViewed', visible: false, title: '', subtitle: '' }]
    });

    expect(result.title).toBe('Novo título');
    expect(result.description).toBe('Nova descrição');
    expect(result.sections).toEqual([
      { type: 'mostViewed', visible: false, title: 'Mais vistos', subtitle: 'O que as leitoras estão consumindo agora.' }
    ]);

    const cached = await service.getPublic();
    expect(cached.title).toBe('Novo título');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd server && npx vitest run src/services/blog.service.test.ts`
Expected: FAIL — cannot find module `./blog.service`

- [ ] **Step 4: Write the implementation**

Create `server/src/services/blog.service.ts`:

```ts
import { Page, PageStatus, Prisma } from '@prisma/client';
import { cacheKeys, cacheProvider, cacheTTL } from '../config/cache';
import { HttpError } from '../utils/errors';
import { PageRepository } from '../repositories/page.repository';
import { defaultBlogLayout, normalizeBlogLayout, type BlogSection } from '../utils/blogLayout';

const repository = new PageRepository();

export type BlogAdminConfig = {
  id: string;
  title: string;
  description: string;
  sections: BlogSection[];
};

export type BlogPublicConfig = Omit<BlogAdminConfig, 'id'>;

export class BlogService {
  private async upsertBlog(): Promise<Page> {
    const existing = await repository.findBySlugOrKey('blog');

    if (!existing) {
      const created = await repository.create({
        slug: 'blog',
        pageKey: 'blog',
        title: 'Jornadas e reflexões',
        description: 'Leituras rápidas, aplicáveis e cuidadosas.',
        layout: defaultBlogLayout() as Prisma.InputJsonValue,
        status: PageStatus.published,
        publishedAt: new Date()
      });
      await this.syncCache(created);
      return created;
    }

    const needsUpdate =
      existing.slug !== 'blog' ||
      existing.pageKey !== 'blog' ||
      existing.status !== PageStatus.published ||
      !existing.publishedAt;

    if (!needsUpdate) return existing;

    const updated = await repository.update(existing.id, {
      slug: 'blog',
      pageKey: 'blog',
      status: PageStatus.published,
      publishedAt: existing.publishedAt ?? new Date()
    });
    await this.syncCache(updated);
    return updated;
  }

  async ensureBlog(): Promise<Page> {
    return this.upsertBlog();
  }

  private toPublicConfig(page: Page): BlogPublicConfig {
    const layout = normalizeBlogLayout(page.layout);
    return {
      title: page.title,
      description: page.description ?? '',
      sections: layout.sections
    };
  }

  private toAdminConfig(page: Page): BlogAdminConfig {
    return { id: page.id, ...this.toPublicConfig(page) };
  }

  async getAdmin(): Promise<BlogAdminConfig> {
    const page = await this.ensureBlog();
    return this.toAdminConfig(page);
  }

  async getPublic(): Promise<BlogPublicConfig> {
    return cacheProvider.wrap(cacheKeys.blog, cacheTTL.blog, async () => {
      const page = await this.ensureBlog();
      return this.toPublicConfig(page);
    });
  }

  async updateBlog(
    id: string,
    payload: { title?: string; description?: string | null; sections?: unknown }
  ): Promise<BlogAdminConfig> {
    const existing = await repository.findById(id);
    if (!existing || (existing.pageKey !== 'blog' && existing.slug !== 'blog')) {
      throw new HttpError(404, 'Blog não encontrado');
    }

    const currentLayout = normalizeBlogLayout(existing.layout);
    const nextLayout = normalizeBlogLayout({
      version: 1,
      sections: payload.sections ?? currentLayout.sections
    });

    const updated = await repository.update(id, {
      slug: 'blog',
      pageKey: 'blog',
      title: payload.title?.trim() || existing.title || 'Jornadas e reflexões',
      description: payload.description === undefined ? (existing.description ?? null) : (payload.description ?? null),
      layout: nextLayout as Prisma.InputJsonValue,
      status: PageStatus.published,
      publishedAt: existing.publishedAt ?? new Date()
    });
    await this.syncCache(updated);
    return this.toAdminConfig(updated);
  }

  private async syncCache(page: Page): Promise<void> {
    await cacheProvider.set(cacheKeys.blog, this.toPublicConfig(page), cacheTTL.blog);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx vitest run src/services/blog.service.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Run the full server test suite**

Run: `cd server && npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/src/config/env.ts server/.env.example server/src/config/cache.ts server/src/services/blog.service.ts server/src/services/blog.service.test.ts
git commit -m "feat: add BlogService for the reserved blog page config"
```

---

## Task 4: Compose the blog config into the public `/public/blog/home` response

**Files:**
- Modify: `server/src/modules/public/posts.controller.ts`

**Interfaces:**
- Consumes: `BlogService.getPublic()` (Task 3).
- Produces: `GET /api/public/blog/home` now returns `{featured, mostViewed, latest, title, description, sections}` instead of just `{featured, mostViewed, latest}`.

There is no existing controller-level test harness in this codebase (no supertest/express test app anywhere), so this thin composition change is verified manually rather than with a new test file — matching the project's actual testing conventions instead of introducing new test infrastructure for a 3-line change.

- [ ] **Step 1: Modify the controller**

In `server/src/modules/public/posts.controller.ts`, add the import and instance near the top:

```ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { PostService } from '../../services/post.service';
import { BlogService } from '../../services/blog.service';
import { sendSuccess } from '../../utils/responses';
import { idParamSchema } from '../../utils/validation';

const service = new PostService();
const blogService = new BlogService();
```

Replace the `getBlogHome` handler:

```ts
export async function getBlogHome(_req: Request, res: Response) {
  const [posts, config] = await Promise.all([service.getBlogHome(), blogService.getPublic()]);
  return sendSuccess(res, { ...posts, ...config });
}
```

- [ ] **Step 2: Manual verification**

Run: `cd server && npm run dev` (or `npm run dev` from the repo root, which starts both server and client)

Then, in another terminal:

```bash
curl -s http://localhost:4000/api/public/blog/home | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(Object.keys(d.data))"
```

Expected output includes `featured, mostViewed, latest, title, description, sections`.

- [ ] **Step 3: Run the full server test suite (regression check)**

Run: `cd server && npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/public/posts.controller.ts
git commit -m "feat: include blog header/section config in the public blog-home response"
```

---

## Task 5: Admin blog routes (`GET`/`PUT /api/admin/blog`) + reserve `'blog'` in the generic pages endpoints

**Files:**
- Create: `server/src/modules/admin/blog.controller.ts`
- Modify: `server/src/modules/admin/admin.routes.ts`
- Modify: `server/src/modules/admin/pages.controller.ts`

**Interfaces:**
- Consumes: `BlogService` (Task 3), `BLOG_SECTION_TYPES` (Task 2).
- Produces: `GET /api/admin/blog` → `BlogAdminConfig`; `PUT /api/admin/blog/:id` → `BlogAdminConfig`. Consumed by Task 6 (`client/src/api/queries.ts`).

Like Task 4, there's no controller-test harness in this codebase — this task is verified with manual `curl` calls against the running dev server (commands given below), not a new automated test file.

- [ ] **Step 1: Create the admin blog controller**

Create `server/src/modules/admin/blog.controller.ts`:

```ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { BLOG_SECTION_TYPES } from '../../utils/blogLayout';
import { BlogService } from '../../services/blog.service';
import { sendSuccess } from '../../utils/responses';
import { idParamSchema } from '../../utils/validation';

const service = new BlogService();

const blogSectionInputSchema = z.object({
  type: z.enum(BLOG_SECTION_TYPES),
  visible: z.boolean().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional()
});

// Express 5 encaminha automaticamente rejeições de handlers async para o
// error middleware — não é preciso repetir try/catch + next(error).

export async function getBlogAdmin(_req: Request, res: Response) {
  const data = await service.getAdmin();
  return sendSuccess(res, data);
}

export async function updateBlogContent(req: Request, res: Response) {
  const payload = z
    .object({
      title: z.string().optional(),
      description: z.string().optional().nullable(),
      sections: z.array(blogSectionInputSchema).optional()
    })
    .parse(req.body);
  const { id } = idParamSchema.parse(req.params);

  const data = await service.updateBlog(id, payload);
  return sendSuccess(res, data);
}
```

- [ ] **Step 2: Wire the routes**

In `server/src/modules/admin/admin.routes.ts`, add the import:

```ts
import { getBlogAdmin, updateBlogContent } from './blog.controller';
```

Add the routes right after the existing home routes:

```ts
adminRoutes.get('/admin/home', getHomeAdmin);
adminRoutes.put('/admin/home/:id', updateHomeContent);
adminRoutes.post('/admin/pages/ensure-home', ensureHome);

adminRoutes.get('/admin/blog', getBlogAdmin);
adminRoutes.put('/admin/blog/:id', updateBlogContent);
```

- [ ] **Step 3: Reserve `'blog'` in the generic pages admin endpoints**

Replace the full contents of `server/src/modules/admin/pages.controller.ts` with:

```ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { PageService } from '../../services/page.service';
import { sendSuccess } from '../../utils/responses';
import { pageLayoutSchema } from '../../utils/pageLayout';
import { HomeService } from '../../services/home.service';
import { HttpError } from '../../utils/errors';
import { idParamSchema } from '../../utils/validation';

const service = new PageService();
const homeService = new HomeService();

const baseSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras, números e hifens para o slug'),
  title: z.string().min(2),
  description: z.string().nullable().optional(),
  layout: pageLayoutSchema.default({ version: 1, columns: 1, cols: [] }),
  status: z.enum(['draft', 'published']).optional(),
  publishedAt: z.string().datetime().nullable().optional()
});

// Express 5 encaminha automaticamente rejeições de handlers async para o
// error middleware (ver server/src/middleware/error.ts) — não é preciso
// repetir try/catch + next(error) em cada handler (Fase 5 do plano de
// template: docs/plano-template.md).

export async function listPages(_req: Request, res: Response) {
  const data = await service.listAdmin();
  return sendSuccess(res, data);
}

export async function createPage(req: Request, res: Response) {
  const payload = baseSchema.parse(req.body);
  const data = await service.create({
    ...payload,
    publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : null
  });
  return sendSuccess(res, data, 201);
}

export async function updatePage(req: Request, res: Response) {
  const payload = baseSchema.partial().parse(req.body);
  const { id } = idParamSchema.parse(req.params);

  const existing = await service.getAdminById(id);
  const isHome = existing.pageKey === 'home' || existing.slug === 'home';
  if (isHome) {
    const { page } = await homeService.updateHome(id, {
      title: payload.title,
      description: payload.description,
      layout: payload.layout
    });
    return sendSuccess(res, { page, changedToDraft: false });
  }
  if (existing.pageKey === 'blog' || existing.slug === 'blog') {
    throw new HttpError(400, 'Esta página é reservada pelo sistema. Use o endpoint /api/admin/blog.');
  }

  const { page, changedToDraft } = await service.update(id, {
    ...payload,
    publishedAt: payload.publishedAt === undefined ? undefined : payload.publishedAt ? new Date(payload.publishedAt) : null
  });
  return sendSuccess(res, { page, changedToDraft });
}

export async function getPageAdmin(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const data = await service.getAdminById(id);
  if (data.pageKey === 'home' || data.slug === 'home') {
    const home = await homeService.getAdmin();
    return sendSuccess(res, home);
  }
  if (data.pageKey === 'blog' || data.slug === 'blog') {
    throw new HttpError(400, 'Esta página é reservada pelo sistema. Use o endpoint /api/admin/blog.');
  }
  return sendSuccess(res, data);
}

export async function publishPage(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const page = await service.getAdminById(id);
  if (page.pageKey === 'home' || page.slug === 'home') {
    throw new HttpError(400, 'A home já fica publicada automaticamente.');
  }
  if (page.pageKey === 'blog' || page.slug === 'blog') {
    throw new HttpError(400, 'O blog já fica publicado automaticamente.');
  }
  const data = await service.publish(id);
  return sendSuccess(res, data);
}

export async function unpublishPage(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const page = await service.getAdminById(id);
  if (page.pageKey === 'home' || page.slug === 'home') {
    throw new HttpError(400, 'A home não pode ser despublicada.');
  }
  if (page.pageKey === 'blog' || page.slug === 'blog') {
    throw new HttpError(400, 'O blog não pode ser despublicado.');
  }
  const data = await service.unpublish(id);
  return sendSuccess(res, data);
}

export async function deletePage(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const page = await service.getAdminById(id);
  if (page.pageKey === 'home' || page.slug === 'home') {
    throw new HttpError(400, 'A home não pode ser removida.');
  }
  if (page.pageKey === 'blog' || page.slug === 'blog') {
    throw new HttpError(400, 'O blog não pode ser removido.');
  }
  await service.delete(id);
  return sendSuccess(res, { deleted: true });
}
```

- [ ] **Step 4: Manual verification**

With the dev server running (`npm run dev` from repo root) and after logging into the admin in the browser (so the `user_session` cookie is set), run:

```bash
curl -s http://localhost:4000/api/admin/blog -b "user_session=<cookie-value-from-devtools>" | node -e "console.log(require('fs').readFileSync(0,'utf8'))"
```

Expected: a JSON payload with `id`, `title: "Jornadas e reflexões"`, `description`, and `sections` (3 entries: `featured`, `mostViewed`, `allArticles`, all `visible: true`).

```bash
curl -s -X PUT http://localhost:4000/api/admin/blog/<id-from-previous-response> \
  -H "Content-Type: application/json" \
  -b "user_session=<cookie-value>" \
  -d '{"title":"Teste","sections":[{"type":"mostViewed","visible":false}]}'
```

Expected: response with `title: "Teste"` and `sections: [{type:"mostViewed", visible:false, title:"Mais vistos", subtitle:"..."}]`. Then re-run the `GET /api/public/blog/home` check from Task 4 and confirm it reflects the update.

- [ ] **Step 5: Run the full server test suite (regression check)**

Run: `cd server && npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/admin/blog.controller.ts server/src/modules/admin/admin.routes.ts server/src/modules/admin/pages.controller.ts
git commit -m "feat: add admin blog routes and reserve 'blog' in the generic pages endpoints"
```

---

## Task 6: Client types + API functions

**Files:**
- Modify: `client/src/types/content.ts`
- Modify: `client/src/api/queries.ts`

**Interfaces:**
- Produces: `BLOG_SECTION_TYPES`, `type BlogSectionType`, `type BlogSection`, `type BlogAdminConfig` (from `@/types`); `fetchAdminBlog(): Promise<BlogAdminConfig>`, `updateAdminBlog(id, payload): Promise<BlogAdminConfig>`, extended `BlogHomeData` (from `@/api/queries`). Consumed by Task 7 (`useBlog.ts`) and Task 9 (`BlogPage.tsx`).

This task is pure types + thin HTTP wrappers with no branching logic — verified by the TypeScript compiler, not a unit test (matching how the rest of `api/queries.ts` has no dedicated test file in this codebase).

- [ ] **Step 1: Add the blog types**

In `client/src/types/content.ts`, add at the end of the file:

```ts
export const BLOG_SECTION_TYPES = ['featured', 'mostViewed', 'allArticles'] as const;
export type BlogSectionType = (typeof BLOG_SECTION_TYPES)[number];

export type BlogSection = {
  type: BlogSectionType;
  visible: boolean;
  title: string;
  subtitle: string;
};

export type BlogAdminConfig = {
  id: string;
  title: string;
  description: string;
  sections: BlogSection[];
};
```

- [ ] **Step 2: Extend `BlogHomeData` and add the admin API functions**

In `client/src/api/queries.ts`, update the type-only import at the top to include the new types:

```ts
import { api } from './client';
import type { Article, BlogAdminConfig, BlogSection, Media, NavbarItem, Page, SiteSettings, User } from '../types';
```

Replace the `BlogHomeData` type:

```ts
export type BlogHomeData = {
  featured: Article[];
  mostViewed: Article[];
  latest: PaginatedResponse<Article>;
  title: string;
  description: string;
  sections: BlogSection[];
};
```

Add, right after `fetchBlogHome`:

```ts
export const fetchAdminBlog = async (): Promise<BlogAdminConfig> => {
  const { data } = await api.get('/admin/blog');
  return data.data;
};

export const updateAdminBlog = async (
  id: string,
  payload: { title?: string; description?: string | null; sections?: BlogSection[] }
): Promise<BlogAdminConfig> => {
  const { data } = await api.put(`/admin/blog/${id}`, payload);
  return data.data;
};
```

- [ ] **Step 3: Typecheck**

Run: `cd client && npx tsc -b`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add client/src/types/content.ts client/src/api/queries.ts
git commit -m "feat: add client types and API functions for the blog config"
```

---

## Task 7: `useBlog.ts` React Query hooks

**Files:**
- Create: `client/src/hooks/queries/useBlog.ts`

**Interfaces:**
- Consumes: `fetchAdminBlog`, `updateAdminBlog` (Task 6).
- Produces: `useAdminBlog()`, `useUpdateBlog()`. Consumed by Task 8 (`AdminBlogPage.tsx`).

Thin React Query wrapper mirroring `client/src/hooks/queries/useNavbar.ts` exactly — no dedicated test file, consistent with that file having none either. Covered indirectly by Task 8's component tests (which mock `@/api/queries`, exercising these hooks for real).

- [ ] **Step 1: Write the implementation**

Create `client/src/hooks/queries/useBlog.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminBlog, updateAdminBlog } from '@/api/queries';
import type { BlogAdminConfig, BlogSection } from '@/types';

export function useAdminBlog() {
  return useQuery<BlogAdminConfig>({ queryKey: ['admin', 'blog'], queryFn: fetchAdminBlog });
}

export function useUpdateBlog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: string;
      payload: { title?: string; description?: string | null; sections?: BlogSection[] };
    }) => updateAdminBlog(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(['admin', 'blog'], data);
      qc.invalidateQueries({ queryKey: ['blog-home'] });
    }
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `cd client && npx tsc -b`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/queries/useBlog.ts
git commit -m "feat: add useAdminBlog/useUpdateBlog query hooks"
```

---

## Task 8: `AdminBlogPage.tsx` — the section editor

**Files:**
- Create: `client/src/pages/AdminBlogPage.tsx`
- Test: `client/src/pages/AdminBlogPage.test.tsx`
- Modify: `client/src/routes/AppRoutes.tsx`
- Modify: `client/src/components/AdminLayout.tsx`

**Interfaces:**
- Consumes: `useAdminBlog`, `useUpdateBlog` (Task 7); `BlogSection`, `BlogSectionType` (Task 6); `ConfirmModal` from `@/components/AdminUI`; `toast` from `@/components/Toast`; `SeoHead` from `@/components/SeoHead`.
- Produces: `export function AdminBlogPage()`, mounted at `/admin/blog`.

- [ ] **Step 1: Write the failing test**

Create `client/src/pages/AdminBlogPage.test.tsx`:

```tsx
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { BlogAdminConfig } from '@/types';

const mockUpdate = vi.fn(async (id: string, payload: unknown) => ({
  id,
  title: (payload as any).title,
  description: (payload as any).description,
  sections: (payload as any).sections
}));

const initialConfig: BlogAdminConfig = {
  id: 'blog-id',
  title: 'Jornadas e reflexões',
  description: 'Leituras rápidas, aplicáveis e cuidadosas.',
  sections: [
    { type: 'featured', visible: true, title: 'Em destaque', subtitle: 'Sub A' },
    { type: 'mostViewed', visible: true, title: 'Mais vistos', subtitle: 'Sub B' },
    { type: 'allArticles', visible: true, title: 'Todos os artigos', subtitle: 'Sub C' }
  ]
};

vi.mock('@/api/queries', () => ({
  fetchAdminBlog: vi.fn(async () => initialConfig),
  updateAdminBlog: (id: string, payload: unknown) => mockUpdate(id, payload)
}));

import { AdminBlogPage } from './AdminBlogPage';

function renderPage() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  root.render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminBlogPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { container, root };
}

afterEach(() => {
  document.body.innerHTML = '';
  mockUpdate.mockClear();
});

describe('AdminBlogPage', () => {
  test('renders the 3 sections in their configured order', async () => {
    const { container, root } = renderPage();
    await vi.waitFor(() => {
      const headings = Array.from(container.querySelectorAll('strong')).map((el) => el.textContent);
      expect(headings).toEqual(['Em destaque', 'Mais vistos', 'Todos os artigos']);
    });
    root.unmount();
  });

  test('moving a section down changes the rendered order', async () => {
    const { container, root } = renderPage();
    await vi.waitFor(() => {
      expect(container.querySelector('strong')).not.toBeNull();
    });

    const moveDown = Array.from(container.querySelectorAll('button')).find(
      (b) => b.getAttribute('aria-label') === 'Mover Em destaque para baixo'
    ) as HTMLButtonElement;
    moveDown.click();

    await vi.waitFor(() => {
      const headings = Array.from(container.querySelectorAll('strong')).map((el) => el.textContent);
      expect(headings).toEqual(['Mais vistos', 'Em destaque', 'Todos os artigos']);
    });
    root.unmount();
  });

  test('saving sends the current title, description and sections to the API', async () => {
    const { container, root } = renderPage();
    await vi.waitFor(() => {
      expect(container.querySelector('strong')).not.toBeNull();
    });

    const saveButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Salvar'
    ) as HTMLButtonElement;
    saveButton.click();

    await vi.waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('blog-id', expect.objectContaining({ title: 'Jornadas e reflexões' }));
    });
    root.unmount();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/pages/AdminBlogPage.test.tsx`
Expected: FAIL — cannot find module `./AdminBlogPage`

- [ ] **Step 3: Write the implementation**

Create `client/src/pages/AdminBlogPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faArrowUp, faEye, faEyeSlash, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { SeoHead } from '@/components/SeoHead';
import { toast } from '@/components/Toast';
import { ConfirmModal } from '@/components/AdminUI';
import { useAdminBlog, useUpdateBlog } from '@/hooks/queries/useBlog';
import type { BlogSection, BlogSectionType } from '@/types';

const SECTION_TYPE_ORDER: BlogSectionType[] = ['featured', 'mostViewed', 'allArticles'];

const SECTION_DEFAULTS: Record<BlogSectionType, { title: string; subtitle: string }> = {
  featured: { title: 'Em destaque', subtitle: 'Selecionados para aparecer primeiro no blog.' },
  mostViewed: { title: 'Mais vistos', subtitle: 'O que as leitoras estão consumindo agora.' },
  allArticles: { title: 'Todos os artigos', subtitle: 'Artigos mais recentes, incluindo destaques e mais vistos.' }
};

const SECTION_TYPE_LABELS: Record<BlogSectionType, string> = {
  featured: 'Em destaque',
  mostViewed: 'Mais vistos',
  allArticles: 'Todos os artigos'
};

type BlogForm = {
  id: string;
  title: string;
  description: string;
  sections: BlogSection[];
};

export function AdminBlogPage() {
  const { data, isLoading, isError, refetch } = useAdminBlog();
  const updateMutation = useUpdateBlog();
  const [form, setForm] = useState<BlogForm | null>(null);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (data) {
      setForm({ id: data.id, title: data.title, description: data.description, sections: data.sections });
    }
  }, [data]);

  if (isLoading || !form) {
    return (
      <div className="admin-page">
        <SeoHead title="Blog" />
        <div className="admin-page-header">
          <h1 style={{ margin: 0 }}>Blog</h1>
          <p className="muted">Carregando...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="admin-page">
        <SeoHead title="Blog" />
        <div className="admin-card">
          <div className="admin-empty">
            <h3>Erro ao carregar o blog</h3>
            <button className="btn btn-primary" type="button" onClick={() => refetch()}>
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentForm = form;
  const availableTypes = SECTION_TYPE_ORDER.filter((type) => !currentForm.sections.some((s) => s.type === type));

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= currentForm.sections.length) return;
    const next = [...currentForm.sections];
    [next[index], next[target]] = [next[target], next[index]];
    setForm({ ...currentForm, sections: next });
  };

  const toggleVisible = (index: number) => {
    const next = currentForm.sections.map((s, i) => (i === index ? { ...s, visible: !s.visible } : s));
    setForm({ ...currentForm, sections: next });
  };

  const updateSectionText = (index: number, field: 'title' | 'subtitle', value: string) => {
    const next = currentForm.sections.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    setForm({ ...currentForm, sections: next });
  };

  const addSection = (type: BlogSectionType) => {
    setForm({
      ...currentForm,
      sections: [...currentForm.sections, { type, visible: true, ...SECTION_DEFAULTS[type] }]
    });
  };

  const confirmRemove = () => {
    if (removeIndex === null) return;
    setForm({ ...currentForm, sections: currentForm.sections.filter((_, i) => i !== removeIndex) });
    setRemoveIndex(null);
  };

  const handleSave = () => {
    updateMutation.mutate(
      { id: currentForm.id, payload: { title: currentForm.title, description: currentForm.description, sections: currentForm.sections } },
      {
        onSuccess: () => toast.success('Blog salvo com sucesso'),
        onError: () => toast.error('Não foi possível salvar', { message: 'Tente novamente em instantes.' })
      }
    );
  };

  return (
    <div className="admin-page">
      <SeoHead title="Blog" />
      <div className="admin-page-header">
        <h1 style={{ margin: 0 }}>Blog</h1>
        <p className="muted">Edite o cabeçalho e organize as seções da página /blog.</p>
      </div>

      <div className="admin-card" style={{ padding: '1.5rem', display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>Cabeçalho</h3>
        <label>
          Título
          <input value={currentForm.title} onChange={(e) => setForm({ ...currentForm, title: e.target.value })} style={{ width: '100%' }} />
        </label>
        <label>
          Descrição
          <input
            value={currentForm.description}
            onChange={(e) => setForm({ ...currentForm, description: e.target.value })}
            style={{ width: '100%' }}
          />
        </label>
      </div>

      <div className="admin-card" style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Seções</h3>
        {currentForm.sections.length === 0 && <div className="admin-empty">Nenhuma seção adicionada.</div>}
        {currentForm.sections.map((section, index) => (
          <div key={section.type} className="admin-card" style={{ padding: '1rem', display: 'grid', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{SECTION_TYPE_LABELS[section.type]}</strong>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => moveSection(index, -1)}
                  disabled={index === 0}
                  aria-label={`Mover ${SECTION_TYPE_LABELS[section.type]} para cima`}
                >
                  <FontAwesomeIcon icon={faArrowUp} />
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => moveSection(index, 1)}
                  disabled={index === currentForm.sections.length - 1}
                  aria-label={`Mover ${SECTION_TYPE_LABELS[section.type]} para baixo`}
                >
                  <FontAwesomeIcon icon={faArrowDown} />
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => toggleVisible(index)}
                  aria-label={section.visible ? 'Ocultar seção' : 'Mostrar seção'}
                >
                  <FontAwesomeIcon icon={section.visible ? faEye : faEyeSlash} />
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setRemoveIndex(index)}
                  aria-label="Remover seção"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
            <label>
              Título da seção
              <input value={section.title} onChange={(e) => updateSectionText(index, 'title', e.target.value)} style={{ width: '100%' }} />
            </label>
            <label>
              Subtítulo da seção
              <input value={section.subtitle} onChange={(e) => updateSectionText(index, 'subtitle', e.target.value)} style={{ width: '100%' }} />
            </label>
          </div>
        ))}

        {availableTypes.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {availableTypes.map((type) => (
              <button key={type} type="button" className="btn btn-outline" onClick={() => addSection(type)}>
                <FontAwesomeIcon icon={faPlus} /> {SECTION_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <button className="btn btn-primary" type="button" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <ConfirmModal
        isOpen={removeIndex !== null}
        onClose={() => setRemoveIndex(null)}
        title="Remover seção"
        description="Tem certeza que deseja remover esta seção? Você pode adicioná-la de volta depois."
        onConfirm={confirmRemove}
        confirmLabel="Remover"
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client && npx vitest run src/pages/AdminBlogPage.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Wire the route and nav item**

In `client/src/routes/AppRoutes.tsx`, add the import right after `AdminHomePage`:

```ts
import { AdminHomePage } from '../pages/AdminHomePage';
import { AdminBlogPage } from '../pages/AdminBlogPage';
```

Add the route right after `home`:

```ts
      { path: 'home', element: <AdminHomePage /> },
      { path: 'blog', element: <AdminBlogPage /> },
```

In `client/src/components/AdminLayout.tsx`, add the nav item right after `'/admin/home'` in `navSections`:

```ts
      { to: '/admin/home', label: 'Página inicial', icon: 'home' },
      { to: '/admin/blog', label: 'Blog', icon: 'article' },
```

and add the page title right after `'/admin/home'` in `pageTitles`:

```ts
  '/admin/home': 'Home',
  '/admin/blog': 'Blog',
```

- [ ] **Step 6: Typecheck**

Run: `cd client && npx tsc -b`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/AdminBlogPage.tsx client/src/pages/AdminBlogPage.test.tsx client/src/routes/AppRoutes.tsx client/src/components/AdminLayout.tsx
git commit -m "feat: add AdminBlogPage section editor and wire it into the admin nav"
```

---

## Task 9: `BlogPage.tsx` — render configured sections + search override

**Files:**
- Modify: `client/src/pages/BlogPage.tsx`
- Test: `client/src/pages/BlogPage.test.tsx`

**Interfaces:**
- Consumes: extended `BlogHomeData`, `fetchBlogHome`, `fetchArticles` (Task 6); `BlogSection` (Task 6).

- [ ] **Step 1: Write the failing test**

Create `client/src/pages/BlogPage.test.tsx`:

```tsx
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { Article } from '@/types';

vi.mock('@/components/SeoHead', () => ({ SeoHead: () => null }));

function makeArticle(overrides: Partial<Article>): Article {
  return {
    id: overrides.id ?? 'a1',
    title: overrides.title ?? 'Artigo',
    slug: overrides.slug ?? 'artigo',
    excerpt: '',
    content: '',
    tags: [],
    status: 'published',
    isFeatured: false,
    views: 0,
    ...overrides
  };
}

const featured = [makeArticle({ id: 'f1', title: 'Destaque 1', slug: 'destaque-1' })];
const mostViewed = [makeArticle({ id: 'm1', title: 'Mais visto 1', slug: 'mais-visto-1' })];
const allArticlesResult = {
  items: [makeArticle({ id: 'a1', title: 'Artigo recente', slug: 'artigo-recente' })],
  total: 1,
  page: 1,
  limit: 6,
  totalPages: 1
};
const searchResult = {
  items: [makeArticle({ id: 's1', title: 'Resultado da busca', slug: 'resultado-busca' })],
  total: 1,
  page: 1,
  limit: 6,
  totalPages: 1
};

const fetchBlogHomeMock = vi.fn(async () => ({
  featured,
  mostViewed,
  latest: allArticlesResult,
  title: 'Jornadas e reflexões',
  description: 'Leituras rápidas, aplicáveis e cuidadosas.',
  sections: [
    { type: 'mostViewed', visible: true, title: 'Mais vistos', subtitle: 'Sub B' },
    { type: 'featured', visible: true, title: 'Em destaque', subtitle: 'Sub A' }
  ]
}));

const fetchArticlesMock = vi.fn(async (filters?: { search?: string }) => (filters?.search ? searchResult : allArticlesResult));

vi.mock('@/api/queries', () => ({
  fetchBlogHome: () => fetchBlogHomeMock(),
  fetchArticles: (filters?: unknown) => fetchArticlesMock(filters)
}));

import { BlogPage } from './BlogPage';

function renderPage() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  root.render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BlogPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { container, root };
}

afterEach(() => {
  document.body.innerHTML = '';
  fetchBlogHomeMock.mockClear();
  fetchArticlesMock.mockClear();
});

describe('BlogPage', () => {
  test('renders sections in the order returned by the config, not the hardcoded order', async () => {
    const { container, root } = renderPage();
    await vi.waitFor(() => {
      const headings = Array.from(container.querySelectorAll('h2')).map((el) => el.textContent);
      expect(headings[0]).toBe('Mais vistos');
      expect(headings[1]).toBe('Em destaque');
    });
    root.unmount();
  });

  test('forces the all-articles list when searching, even without that section in the config', async () => {
    const { container, root } = renderPage();
    await vi.waitFor(() => {
      expect(container.querySelector('input[aria-label="Buscar por título ou tema"]')).not.toBeNull();
    });

    const input = container.querySelector('input[aria-label="Buscar por título ou tema"]') as HTMLInputElement;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    nativeInputValueSetter.call(input, 'algo');
    input.dispatchEvent(new Event('input', { bubbles: true }));

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Resultado da busca');
      expect(container.textContent).not.toContain('Destaque 1');
      expect(container.textContent).not.toContain('Mais visto 1');
      expect(container.textContent).toContain('Todos os artigos');
    });
    root.unmount();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/pages/BlogPage.test.tsx`
Expected: FAIL — assertions fail against the current hardcoded section order/behavior (the component doesn't read `sections` yet)

- [ ] **Step 3: Rewrite the implementation**

Replace the full contents of `client/src/pages/BlogPage.tsx` with:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { ArticleCard } from '../components/ArticleCard';
import { ArticleCardSkeleton } from '../components/ArticleCardSkeleton';
import { ArticleListItem } from '../components/ArticleListItem';
import { ArticleListItemSkeleton } from '../components/ArticleListItemSkeleton';
import { SeoHead } from '../components/SeoHead';
import { fetchArticles, fetchBlogHome, type BlogHomeData } from '../api/queries';
import type { Article, BlogSection } from '../types';
import type { PaginatedResponse } from '../api/queries';

const PER_PAGE = 6;

const DEFAULT_HEADER = {
  title: 'Jornadas e reflexões',
  description: 'Leituras rápidas, aplicáveis e cuidadosas.'
};

const DEFAULT_ALL_ARTICLES_TEXT = {
  title: 'Todos os artigos',
  subtitle: 'Artigos mais recentes, incluindo destaques e mais vistos.'
};

export function BlogPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search]);

  // Buscar dados agregados do blog (featured, mostViewed, cabeçalho, seções)
  const { data: blogHome, isPending: isBlogHomePending } = useQuery<BlogHomeData>({
    queryKey: ['blog-home'],
    queryFn: fetchBlogHome
  });

  const featured = blogHome?.featured ?? [];
  const mostViewed = blogHome?.mostViewed ?? [];
  const sections = blogHome?.sections ?? [];

  const featuredIds = useMemo(() => new Set(featured.map((a) => a.id)), [featured]);
  const mostViewedIds = useMemo(() => new Set(mostViewed.map((a) => a.id)), [mostViewed]);

  // SEMPRE buscar TODOS os artigos (sem excludeIds) para a seção "Todos os artigos"
  const { data: allPosts, isPending: isAllPostsPending } = useQuery<PaginatedResponse<Article>>({
    queryKey: ['articles', 'all-posts', search, page],
    queryFn: () =>
      fetchArticles({
        search: search || undefined,
        page,
        limit: PER_PAGE
      }),
    placeholderData: (prev) => prev
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const totalPages = allPosts?.totalPages ?? 1;
  const isSearching = search.trim().length > 0;
  const allArticlesConfig = sections.find((s) => s.type === 'allArticles');
  const allArticlesTitle = allArticlesConfig?.title || DEFAULT_ALL_ARTICLES_TEXT.title;
  const allArticlesSubtitle = allArticlesConfig?.subtitle || DEFAULT_ALL_ARTICLES_TEXT.subtitle;

  const renderAllArticlesList = (title: string, subtitle: string, key?: string) => (
    <div className="blog-section" key={key}>
      <div className="section-title">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <div className="article-list">
        {isAllPostsPending
          ? Array.from({ length: 6 }).map((_, i) => <ArticleListItemSkeleton key={`skeleton-${i}`} />)
          : allPosts?.items?.map((article) => {
              const badges: string[] = [];
              if (featuredIds.has(article.id)) badges.push('Em destaque');
              if (mostViewedIds.has(article.id)) badges.push('Mais visto');
              return <ArticleListItem key={article.id} article={article} badges={badges.length > 0 ? badges : undefined} />;
            })}
        {!isAllPostsPending && !allPosts?.items?.length && <div className="admin-empty">Nenhum artigo encontrado.</div>}
      </div>
      {allPosts && allPosts.totalPages > 1 && (
        <div className="pagination">
          <button type="button" className="btn btn-outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Anterior
          </button>
          <span className="muted">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );

  const renderSection = (section: BlogSection) => {
    if (section.type === 'featured') {
      return (
        <div className="blog-section" key="featured">
          <div className="section-title">
            <h2>{section.title}</h2>
            <p>{section.subtitle}</p>
          </div>
          {isBlogHomePending ? (
            <div className="article-grid featured-grid">
              {Array.from({ length: 3 }).map((_, i) => (
                <ArticleCardSkeleton key={`skeleton-${i}`} variant="featured" />
              ))}
            </div>
          ) : featured.length > 0 ? (
            <div className="article-grid featured-grid">
              {featured.map((article) => (
                <ArticleCard key={article.id} article={article} variant="featured" badge="Em destaque" />
              ))}
            </div>
          ) : (
            <div className="admin-empty">Nenhum post publicado ainda.</div>
          )}
        </div>
      );
    }

    if (section.type === 'mostViewed') {
      return (
        <div className="blog-section" key="mostViewed">
          <div className="section-title">
            <h2>{section.title}</h2>
            <p>{section.subtitle}</p>
          </div>
          {isBlogHomePending ? (
            <div className="article-grid most-viewed-grid">
              {Array.from({ length: 3 }).map((_, i) => (
                <ArticleCardSkeleton key={`skeleton-${i}`} variant="default" />
              ))}
            </div>
          ) : mostViewed.length > 0 ? (
            <div className="article-grid most-viewed-grid">
              {mostViewed.map((article, index) => (
                <ArticleCard key={article.id} article={article} variant="default" badge={`#${index + 1} Mais visto`} showViews />
              ))}
            </div>
          ) : (
            <div className="admin-empty">Sem dados de visualizações suficientes ainda.</div>
          )}
        </div>
      );
    }

    return renderAllArticlesList(section.title, section.subtitle, 'allArticles');
  };

  return (
    <section className="section-block">
      <div className="container">
        <SeoHead title={blogHome?.title || DEFAULT_HEADER.title} description={blogHome?.description || DEFAULT_HEADER.description} />
        <div className="blog-header">
          <div className="section-title" style={{ marginBottom: 0 }}>
            <h1 style={{ margin: 0 }}>{blogHome?.title || DEFAULT_HEADER.title}</h1>
            <p>{blogHome?.description || DEFAULT_HEADER.description}</p>
          </div>
          <form className="blog-search" onSubmit={handleSearch}>
            <div className="search-shell">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título ou tema"
                aria-label="Buscar por título ou tema"
              />
              <button className="search-button" type="submit" aria-label="Filtrar artigos">
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            </div>
          </form>
        </div>

        <div className="blog-sections">
          {isSearching ? renderAllArticlesList(allArticlesTitle, allArticlesSubtitle) : sections.filter((s) => s.visible).map(renderSection)}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client && npx vitest run src/pages/BlogPage.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full client test suite (regression check)**

Run: `cd client && npx vitest run`
Expected: PASS

- [ ] **Step 6: Typecheck**

Run: `cd client && npx tsc -b`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/BlogPage.tsx client/src/pages/BlogPage.test.tsx
git commit -m "feat: render the blog page from the configured section order"
```

---

## Task 10: Manual end-to-end verification

No new code — this task walks through the scenarios the spec calls out that only make sense against the real running app (visual layout, admin flow, cache behavior).

- [ ] **Step 1: Start the app**

Run: `npm run dev` (from the repo root)

- [ ] **Step 2: Confirm the public page is unchanged before any edit**

Open `http://localhost:5173/blog`. Confirm it looks identical to before this change: header "Jornadas e reflexões" + description + search, then "Em destaque", "Mais vistos", "Todos os artigos" in that order, all populated.

- [ ] **Step 3: Edit in the admin**

Log into `/admin`, go to the new "Blog" nav item (`/admin/blog`). Change the header title/description, reorder the 3 sections, hide one, edit a section's title/subtitle text, and save. Confirm a success toast appears.

- [ ] **Step 4: Confirm the public page reflects the edit**

Reload `http://localhost:5173/blog`. Confirm: new header text, sections in the new order, the hidden section is gone, the edited section shows the new title/subtitle.

- [ ] **Step 5: Confirm remove + re-add**

In `/admin/blog`, remove the "Todos os artigos" section entirely (confirm via the modal) and save. Reload the public page — confirm the search box is still visible in the header, but the "Todos os artigos" list section itself doesn't render inline in the section list. Type a search term — confirm the "Todos os artigos" list still appears with matching results (or "Nenhum artigo encontrado"), using the default title/subtitle text since the section was removed from the config. Go back to `/admin/blog`, add "Todos os artigos" back with a custom title, save, and confirm a non-searching page load shows it in the position you added it (end of the list) and a search now uses your custom title.

- [ ] **Step 6: Confirm generic pages admin rejects the reserved slug/key**

In `/admin/pages`, confirm no "Blog" entry appears in the list (it's excluded like Home). Try creating a new page with slug `blog` — confirm it's rejected with the reserved-slug error message.

- [ ] **Step 7: Final full regression run**

Run: `cd server && npx vitest run` — expect PASS
Run: `cd client && npx vitest run` — expect PASS
Run: `cd client && npx tsc -b` — expect no errors
