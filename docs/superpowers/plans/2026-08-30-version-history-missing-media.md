# Version History — Missing Media Warning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Warn the admin, before and after reverting a page to an older version, when a block in that version references a `Media` row that no longer exists — instead of silently republishing a page with a broken image.

**Architecture:** A single recursive walker (`collectMediaRefs`) extracts every media reference from a `PageLayoutV2`, attributing nested Hero sub-block references to the top-level Hero block id. `findMissingMedia` cross-checks those refs against the `Media` table in one query. This is reused in two places: `PageVersionService.list()` enriches each historical version so the version-history modal can warn before a revert, and a new `GET /admin/pages/:id/missing-media` endpoint checks the page's *current, saved* layout so the editor can highlight affected blocks every time it loads (recomputed after every save/publish/revert via query invalidation).

**Tech Stack:** Express 5 + TypeScript + Prisma (server), React 19 + Vite + TypeScript strict + React Query (client), vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-08-30-version-history-missing-media-design.md`

## Global Constraints

- No `console.log`/`console.*` in server production code.
- No `window.confirm`/`window.prompt` on the client — use `Modal`/`ConfirmModal` from `client/src/components/AdminUI.tsx` (already used by the code this plan touches).
- TypeScript strict, no unexplained `any`.
- Express 5 forwards async handler rejections to the error middleware automatically — do not wrap handlers in `try/catch` + `next(error)`.
- The revert endpoint's contract does not change — the warning is informational only, shown before the existing single confirm click.
- Follow existing test patterns exactly: server tests mock at the module boundary with `vi.mock`/`vi.hoisted`; client tests use `@testing-library/react` with a `QueryClientProvider` wrapper and spy on the query hooks module.

---

## Task 1: `collectMediaRefs` / `findMissingMedia` — shared server walker

**Files:**
- Create: `server/src/services/mediaReferences.service.ts`
- Test: `server/src/services/mediaReferences.service.test.ts`

**Interfaces:**
- Consumes: `PageLayoutV2`, `PageBlock` types from `server/src/utils/pageLayout.ts`; `prisma` from `server/src/config/prisma.ts`.
- Produces: `type MediaRef = { blockId: string; mediaId: string }`; `collectMediaRefs(layout: PageLayoutV2): MediaRef[]`; `findMissingMedia(layout: PageLayoutV2): Promise<MediaRef[]>` — both exported from `server/src/services/mediaReferences.service.ts`. Consumed by Task 2 and Task 3.

- [ ] **Step 1: Write the failing tests**

Create `server/src/services/mediaReferences.service.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { PageBlock, PageLayoutV2 } from '../utils/pageLayout';

vi.mock('../config/prisma', () => ({
  prisma: { media: { findMany: vi.fn() } }
}));

import { prisma } from '../config/prisma';
import { collectMediaRefs, findMissingMedia } from './mediaReferences.service';

function layoutWithBlocks(blocks: PageBlock[]): PageLayoutV2 {
  return {
    version: 2,
    sections: [{ id: 's1', columns: 1, cols: [{ id: 'col-1', blocks }], settings: {} }]
  };
}

const now = '2026-08-30T12:00:00.000Z';

describe('collectMediaRefs', () => {
  it('collects mediaId from an image block', () => {
    const block: PageBlock = {
      id: 'b1',
      type: 'image',
      createdAt: now,
      updatedAt: now,
      data: { mediaId: 'm1', src: 'https://x/img.webp', size: 100, align: 'center' }
    };
    expect(collectMediaRefs(layoutWithBlocks([block]))).toEqual([{ blockId: 'b1', mediaId: 'm1' }]);
  });

  it('ignores an image block without a mediaId', () => {
    const block: PageBlock = {
      id: 'b1',
      type: 'image',
      createdAt: now,
      updatedAt: now,
      data: { mediaId: null, src: 'https://x/img.webp', size: 100, align: 'center' }
    };
    expect(collectMediaRefs(layoutWithBlocks([block]))).toEqual([]);
  });

  it('collects imageId from Hero V1 singleImage and fourCards', () => {
    const block: PageBlock = {
      id: 'hero1',
      type: 'hero',
      createdAt: now,
      updatedAt: now,
      isLocked: true,
      data: {
        singleImage: { imageId: 'm-single', url: 'https://x/a.webp', alt: '', focal: null },
        fourCards: {
          medium: { title: 't', text: 't', icon: null, imageId: 'm-medium', url: null, alt: null },
          small: [
            { title: 't', text: 't', icon: null, imageId: 'm-small-1', url: null, alt: null },
            { title: 't', text: 't', icon: null, imageId: null, url: null, alt: null },
            { title: 't', text: 't', icon: null, imageId: 'm-small-3', url: null, alt: null }
          ]
        }
      }
    };
    const refs = collectMediaRefs(layoutWithBlocks([block]));
    expect(refs).toEqual([
      { blockId: 'hero1', mediaId: 'm-single' },
      { blockId: 'hero1', mediaId: 'm-medium' },
      { blockId: 'hero1', mediaId: 'm-small-1' },
      { blockId: 'hero1', mediaId: 'm-small-3' }
    ]);
  });

  it('collects mediaId from a Hero V2 nested right-column image block, attributed to the Hero id', () => {
    const nestedImage: PageBlock = {
      id: 'nested-image',
      type: 'image',
      createdAt: now,
      updatedAt: now,
      data: { mediaId: 'm-nested', src: 'https://x/right.webp', size: 100, align: 'center' }
    };
    const heroBlock: PageBlock = {
      id: 'hero2',
      type: 'hero',
      createdAt: now,
      updatedAt: now,
      isLocked: true,
      data: {
        version: 2,
        layout: 'two-col',
        left: [],
        right: [nestedImage],
        rightVariant: 'image-only'
      }
    };
    const refs = collectMediaRefs(layoutWithBlocks([heroBlock]));
    expect(refs).toEqual([{ blockId: 'hero2', mediaId: 'm-nested' }]);
  });

  it('collects iconImageId from cards items with iconType "image", ignoring emoji icons', () => {
    const block: PageBlock = {
      id: 'cards1',
      type: 'cards',
      createdAt: now,
      updatedAt: now,
      data: {
        items: [
          { id: 'i1', title: 'A', text: 'a', iconType: 'image', iconImageId: 'm-icon-1' },
          { id: 'i2', title: 'B', text: 'b', iconType: 'emoji', icon: '🌿', iconImageId: null }
        ],
        layout: 'auto',
        variant: 'feature'
      }
    };
    expect(collectMediaRefs(layoutWithBlocks([block]))).toEqual([{ blockId: 'cards1', mediaId: 'm-icon-1' }]);
  });

  it('collects imageId from cta and media-text blocks', () => {
    const ctaBlock: PageBlock = {
      id: 'cta1',
      type: 'cta',
      createdAt: now,
      updatedAt: now,
      data: { imageId: 'm-cta' }
    };
    const mediaTextBlock: PageBlock = {
      id: 'mt1',
      type: 'media-text',
      createdAt: now,
      updatedAt: now,
      data: { contentHtml: '<p>x</p>', imageId: 'm-mt' }
    };
    expect(collectMediaRefs(layoutWithBlocks([ctaBlock, mediaTextBlock]))).toEqual([
      { blockId: 'cta1', mediaId: 'm-cta' },
      { blockId: 'mt1', mediaId: 'm-mt' }
    ]);
  });

  it('collects iconImageId from services top-level and from each item', () => {
    const block: PageBlock = {
      id: 'svc1',
      type: 'services',
      createdAt: now,
      updatedAt: now,
      data: {
        sectionTitle: 'Serviços',
        iconImageId: 'm-svc-top',
        items: [
          { id: 'i1', title: 'A', href: '/a', iconImageId: 'm-svc-item-1' },
          { id: 'i2', title: 'B', href: '/b', iconImageId: null }
        ]
      }
    };
    expect(collectMediaRefs(layoutWithBlocks([block]))).toEqual([
      { blockId: 'svc1', mediaId: 'm-svc-top' },
      { blockId: 'svc1', mediaId: 'm-svc-item-1' }
    ]);
  });

  it('returns an empty array for a layout with no sections', () => {
    expect(collectMediaRefs({ version: 2, sections: [] })).toEqual([]);
  });
});

describe('findMissingMedia', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not query the database when the layout has no media references', async () => {
    const layout = layoutWithBlocks([]);
    const result = await findMissingMedia(layout);
    expect(result).toEqual([]);
    expect(prisma.media.findMany).not.toHaveBeenCalled();
  });

  it('queries with deduplicated ids and returns only the refs not found', async () => {
    const blockA: PageBlock = {
      id: 'a',
      type: 'image',
      createdAt: now,
      updatedAt: now,
      data: { mediaId: 'm1', src: 'https://x/a.webp', size: 100, align: 'center' }
    };
    const blockB: PageBlock = {
      id: 'b',
      type: 'image',
      createdAt: now,
      updatedAt: now,
      data: { mediaId: 'm1', src: 'https://x/a.webp', size: 100, align: 'center' }
    };
    const blockC: PageBlock = {
      id: 'c',
      type: 'cta',
      createdAt: now,
      updatedAt: now,
      data: { imageId: 'm2' }
    };
    vi.mocked(prisma.media.findMany).mockResolvedValue(
      [{ id: 'm1' }] as unknown as Awaited<ReturnType<typeof prisma.media.findMany>>
    );

    const result = await findMissingMedia(layoutWithBlocks([blockA, blockB, blockC]));

    expect(prisma.media.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['m1', 'm2'] } },
      select: { id: true }
    });
    expect(result).toEqual([{ blockId: 'c', mediaId: 'm2' }]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd server && npx vitest run src/services/mediaReferences.service.test.ts`
Expected: FAIL — `./mediaReferences.service` module not found.

- [ ] **Step 3: Implement**

Create `server/src/services/mediaReferences.service.ts`:

```ts
import { prisma } from '../config/prisma';
import type { HeroBlockDataV1, PageBlock, PageLayoutV2 } from '../utils/pageLayout';

export type MediaRef = { blockId: string; mediaId: string };

// Uma referência aninhada dentro de um Hero (V1 singleImage/fourCards, V2
// left/right) é sempre atribuída ao id do próprio bloco Hero de topo, nunca
// ao id do sub-bloco interno — o Hero é selecionado/editado como uma
// unidade só no editor (isLocked: true), então não há como destacar um
// sub-bloco isoladamente lá.
function collectFromBlock(block: PageBlock, refs: MediaRef[]): void {
  switch (block.type) {
    case 'image': {
      if (block.data.mediaId) refs.push({ blockId: block.id, mediaId: block.data.mediaId });
      break;
    }
    case 'hero': {
      const data = block.data;
      if ('version' in data && data.version === 2) {
        const nested: MediaRef[] = [];
        [...data.left, ...data.right].forEach((nestedBlock) => collectFromBlock(nestedBlock, nested));
        nested.forEach((ref) => refs.push({ blockId: block.id, mediaId: ref.mediaId }));
      } else {
        const v1 = data as HeroBlockDataV1;
        if (v1.singleImage?.imageId) refs.push({ blockId: block.id, mediaId: v1.singleImage.imageId });
        if (v1.fourCards?.medium?.imageId) refs.push({ blockId: block.id, mediaId: v1.fourCards.medium.imageId });
        v1.fourCards?.small?.forEach((card) => {
          if (card.imageId) refs.push({ blockId: block.id, mediaId: card.imageId });
        });
      }
      break;
    }
    case 'cards': {
      block.data.items.forEach((item) => {
        if (item.iconType === 'image' && item.iconImageId) {
          refs.push({ blockId: block.id, mediaId: item.iconImageId });
        }
      });
      break;
    }
    case 'cta': {
      if (block.data.imageId) refs.push({ blockId: block.id, mediaId: block.data.imageId });
      break;
    }
    case 'media-text': {
      if (block.data.imageId) refs.push({ blockId: block.id, mediaId: block.data.imageId });
      break;
    }
    case 'services': {
      if (block.data.iconImageId) refs.push({ blockId: block.id, mediaId: block.data.iconImageId });
      block.data.items.forEach((item) => {
        if (item.iconImageId) refs.push({ blockId: block.id, mediaId: item.iconImageId });
      });
      break;
    }
    default:
      break;
  }
}

export function collectMediaRefs(layout: PageLayoutV2): MediaRef[] {
  const refs: MediaRef[] = [];
  (layout?.sections ?? []).forEach((section) => {
    (section?.cols ?? []).forEach((col) => {
      (col?.blocks ?? []).forEach((block) => collectFromBlock(block, refs));
    });
  });
  return refs;
}

export async function findMissingMedia(layout: PageLayoutV2): Promise<MediaRef[]> {
  const refs = collectMediaRefs(layout);
  const ids = [...new Set(refs.map((r) => r.mediaId))];
  if (ids.length === 0) return [];
  const found = await prisma.media.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const foundSet = new Set(found.map((m) => m.id));
  return refs.filter((r) => !foundSet.has(r.mediaId));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd server && npx vitest run src/services/mediaReferences.service.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/mediaReferences.service.ts server/src/services/mediaReferences.service.test.ts
git commit -m "feat(server): add collectMediaRefs/findMissingMedia to detect deleted media in a page layout"
```

---

## Task 2: `PageVersionService.list()` enriches each version with `missingMedia`

**Files:**
- Modify: `server/src/services/pageVersion.service.ts`
- Modify: `server/src/services/pageVersion.service.test.ts`

**Interfaces:**
- Consumes: `findMissingMedia`, `MediaRef` from `server/src/services/mediaReferences.service.ts` (Task 1); `PageLayoutV2` from `server/src/utils/pageLayout.ts`.
- Produces: `PageVersionService.list(pageId: string): Promise<(PageVersion & { missingMedia: MediaRef[] })[]>` — consumed by Task 3's controller test conventions are unaffected, and by the client in Task 4/5.

- [ ] **Step 1: Update the failing test**

In `server/src/services/pageVersion.service.test.ts`, add the mock and replace the `PageVersionService.list` describe block.

Add near the top, after the existing `vi.mock('../config/env', ...)` block:

```ts
vi.mock('./mediaReferences.service', () => ({
  findMissingMedia: vi.fn()
}));
```

Add the import alongside the existing `import { PageVersionService } from './pageVersion.service';`:

```ts
import { findMissingMedia } from './mediaReferences.service';
```

Replace the existing `describe('PageVersionService.list', ...)` block with:

```ts
describe('PageVersionService.list', () => {
  beforeEach(() => vi.clearAllMocks());

  it('enriches each version with its missingMedia list, preserving repository order', async () => {
    mockRepo.listByPage.mockResolvedValue([
      { id: 'v1', layout: { version: 2, sections: [] } },
      { id: 'v2', layout: { version: 2, sections: [] } }
    ]);
    vi.mocked(findMissingMedia)
      .mockResolvedValueOnce([{ blockId: 'b1', mediaId: 'm1' }])
      .mockResolvedValueOnce([]);
    const service = new PageVersionService();

    const result = await service.list('p1');

    expect(mockRepo.listByPage).toHaveBeenCalledWith('p1');
    expect(findMissingMedia).toHaveBeenNthCalledWith(1, { version: 2, sections: [] });
    expect(findMissingMedia).toHaveBeenNthCalledWith(2, { version: 2, sections: [] });
    expect(result).toEqual([
      { id: 'v1', layout: { version: 2, sections: [] }, missingMedia: [{ blockId: 'b1', mediaId: 'm1' }] },
      { id: 'v2', layout: { version: 2, sections: [] }, missingMedia: [] }
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd server && npx vitest run src/services/pageVersion.service.test.ts`
Expected: FAIL — `service.list('p1')` currently returns the raw repository rows with no `missingMedia` field, and `findMissingMedia` is never called.

- [ ] **Step 3: Implement**

In `server/src/services/pageVersion.service.ts`, add the imports:

```ts
import { findMissingMedia, type MediaRef } from './mediaReferences.service';
import type { PageLayoutV2 } from '../utils/pageLayout';
```

Replace the `list` method:

```ts
  async list(pageId: string): Promise<(PageVersion & { missingMedia: MediaRef[] })[]> {
    const versions = await repository.listByPage(pageId);
    return Promise.all(
      versions.map(async (version) => ({
        ...version,
        missingMedia: await findMissingMedia(version.layout as unknown as PageLayoutV2)
      }))
    );
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd server && npx vitest run src/services/pageVersion.service.test.ts`
Expected: PASS, all tests (existing `snapshot`/`getForRevert` describes plus the updated `list` describe).

- [ ] **Step 5: Commit**

```bash
git add server/src/services/pageVersion.service.ts server/src/services/pageVersion.service.test.ts
git commit -m "feat(server): PageVersionService.list enriches each version with missingMedia"
```

---

## Task 3: `GET /admin/pages/:id/missing-media` — current-layout check

**Files:**
- Modify: `server/src/modules/admin/pages.controller.ts`
- Modify: `server/src/modules/admin/pages.controller.test.ts`
- Modify: `server/src/modules/admin/admin.routes.ts`

**Interfaces:**
- Consumes: `findMissingMedia` from `server/src/services/mediaReferences.service.ts` (Task 1); `service.getAdminById` (existing `PageService` method); `requirePageAccess`, `resolveParamPageId` (existing, from `server/src/middleware/permissions.ts` and `admin.routes.ts`).
- Produces: `getPageMissingMedia(req, res)` handler; route `GET /admin/pages/:id/missing-media` — consumed by Task 4's client fetch function.

- [ ] **Step 1: Write the failing test**

In `server/src/modules/admin/pages.controller.test.ts`, add a new `vi.mock` call for the new service module, right after the existing `vi.mock('../../middleware/permissions', () => ({ getAccessiblePageIds: vi.fn() }));` block:

```ts
vi.mock('../../services/mediaReferences.service', () => ({
  findMissingMedia: vi.fn()
}));
```

Add to the imports block, alongside the existing `import { listPages, listPageVersions, revertPageVersion } from './pages.controller';`:

```ts
import { getPageMissingMedia, listPages, listPageVersions, revertPageVersion } from './pages.controller';
import { findMissingMedia } from '../../services/mediaReferences.service';
```

Add a new `describe` block at the end of the file:

```ts
describe('getPageMissingMedia', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the missing media refs for the page\'s current saved layout', async () => {
    mockGetAdminById.mockResolvedValue({ id: PAGE_ID, layout: { version: 2, sections: [] } });
    vi.mocked(findMissingMedia).mockResolvedValue([{ blockId: 'b1', mediaId: 'm1' }]);
    const req = { params: { id: PAGE_ID } } as unknown as Request;
    const res = makeRes();

    await getPageMissingMedia(req, res);

    expect(mockGetAdminById).toHaveBeenCalledWith(PAGE_ID);
    expect(findMissingMedia).toHaveBeenCalledWith({ version: 2, sections: [] });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [{ blockId: 'b1', mediaId: 'm1' }] }));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd server && npx vitest run src/modules/admin/pages.controller.test.ts`
Expected: FAIL — `getPageMissingMedia` is not exported from `./pages.controller`.

- [ ] **Step 3: Implement the controller**

In `server/src/modules/admin/pages.controller.ts`, add the import:

```ts
import { findMissingMedia } from '../../services/mediaReferences.service';
import type { PageLayoutV2 } from '../../utils/pageLayout';
```

Add the handler, right after `listPageVersions`:

```ts
export async function getPageMissingMedia(req: Request, res: Response) {
  const { id } = uuidParamSchema.parse(req.params);
  const page = await service.getAdminById(id);
  const data = await findMissingMedia(page.layout as unknown as PageLayoutV2);
  return sendSuccess(res, data);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd server && npx vitest run src/modules/admin/pages.controller.test.ts`
Expected: PASS, all tests including the new `getPageMissingMedia` describe.

- [ ] **Step 5: Wire the route**

In `server/src/modules/admin/admin.routes.ts`, add `getPageMissingMedia` to the import from `./pages.controller`:

```ts
import {
  createPage,
  deletePage,
  getPageAdmin,
  getPageMissingMedia,
  listPages,
  listPageVersions,
  publishPage,
  revertPageVersion,
  unpublishPage,
  updatePage
} from './pages.controller';
```

Add the route right after the existing `adminRoutes.delete('/admin/pages/:id', ...)` line and before the "Histórico de versões" comment:

```ts
adminRoutes.get('/admin/pages/:id/missing-media', requirePageAccess(resolveParamPageId), getPageMissingMedia);
```

- [ ] **Step 6: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add server/src/modules/admin/pages.controller.ts server/src/modules/admin/pages.controller.test.ts server/src/modules/admin/admin.routes.ts
git commit -m "feat(server): add GET /admin/pages/:id/missing-media endpoint"
```

---

## Task 4: Client types, API function, and query hooks

**Files:**
- Modify: `client/src/types/layout.ts`
- Modify: `client/src/api/queries.ts`
- Modify: `client/src/hooks/queries/usePages.ts`

**Interfaces:**
- Produces: `type MissingMediaRef = { blockId: string; mediaId: string }` (exported from `client/src/types/layout.ts`, re-exported via `client/src/types/index.ts`); `PageVersion` gains `missingMedia: MissingMediaRef[]`; `fetchPageMissingMedia(id: string): Promise<MissingMediaRef[]>` (from `client/src/api/queries.ts`); `usePageMissingMedia(pageId: string | undefined, enabled?: boolean)` query hook (from `client/src/hooks/queries/usePages.ts`), query key `['admin', 'pages', pageId, 'missing-media']` — consumed by Task 5 and Task 6.
- Consumes: `api` from `client/src/api/client.ts` (existing).

No new test file for this task — it's pure types/plumbing exercised by Task 5 and Task 6's tests. This task's own verification is the typecheck step.

- [ ] **Step 1: Add the `MissingMediaRef` type and extend `PageVersion`**

In `client/src/types/layout.ts`, replace the existing `PageVersion` type:

```ts
export type PageVersion = {
  id: string;
  pageId: string;
  title: string;
  description?: string | null;
  layout: PageLayout;
  publishedAt: string;
  actorId?: string | null;
  actorName: string;
  actorEmail: string;
};
```

with:

```ts
export type MissingMediaRef = {
  blockId: string;
  mediaId: string;
};

export type PageVersion = {
  id: string;
  pageId: string;
  title: string;
  description?: string | null;
  layout: PageLayout;
  publishedAt: string;
  actorId?: string | null;
  actorName: string;
  actorEmail: string;
  missingMedia: MissingMediaRef[];
};
```

- [ ] **Step 2: Add the fetch function**

In `client/src/api/queries.ts`, add `MissingMediaRef` to the type import line (line 2):

```ts
import type { Article, AuditLogEntry, BlogAdminConfig, BlogSection, Media, ManagedUser, MissingMediaRef, NavbarItem, Page, PageVersion, SectionAccess, SiteSettings, User } from '../types';
```

Add the function right after `revertPageVersion`:

```ts
export const fetchPageMissingMedia = async (id: string): Promise<MissingMediaRef[]> => {
  const { data } = await api.get(`/admin/pages/${id}/missing-media`);
  return data.data;
};
```

- [ ] **Step 3: Add the query hook and wire invalidation**

In `client/src/hooks/queries/usePages.ts`, add `fetchPageMissingMedia` to the import from `@/api/queries`:

```ts
import {
  createPage,
  deletePage,
  fetchAdminPages,
  fetchPageMissingMedia,
  fetchPageVersions,
  publishPage,
  revertPageVersion,
  unpublishPage,
  updatePage
} from '@/api/queries';
```

Add the new hook after `useRevertPageVersion`:

```ts
export function usePageMissingMedia(pageId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'pages', pageId, 'missing-media'],
    queryFn: () => fetchPageMissingMedia(pageId as string),
    enabled: enabled && !!pageId
  });
}
```

Update `useUpdatePage`'s `onSuccess` to also invalidate the missing-media query for the edited page:

```ts
export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Page> }) => updatePage(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      qc.invalidateQueries({ queryKey: ['admin', 'pages', data.page.id, 'missing-media'] });
    }
  });
}
```

Update `usePublishPage`'s `onSuccess`:

```ts
export function usePublishPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publishPage,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      qc.invalidateQueries({ queryKey: ['page', data.slug] });
      qc.invalidateQueries({ queryKey: ['admin', 'pages', data.id, 'missing-media'] });
    }
  });
}
```

Update `useRevertPageVersion`'s `onSuccess`:

```ts
export function useRevertPageVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, versionId }: { pageId: string; versionId: string }) => revertPageVersion(pageId, versionId),
    onSuccess: (data, { pageId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      qc.invalidateQueries({ queryKey: ['admin', 'pages', pageId, 'versions'] });
      qc.invalidateQueries({ queryKey: ['page', data.slug] });
      qc.invalidateQueries({ queryKey: ['admin', 'pages', pageId, 'missing-media'] });
    }
  });
}
```

- [ ] **Step 4: Typecheck**

Run: `cd client && npx tsc -b`
Expected: no errors. (This will surface any test fixture missing the now-required `missingMedia` field on `PageVersion` — Task 5 fixes the one existing offender, `PageVersionHistoryModal.test.tsx`.)

- [ ] **Step 5: Commit**

```bash
git add client/src/types/layout.ts client/src/api/queries.ts client/src/hooks/queries/usePages.ts
git commit -m "feat(client): add MissingMediaRef type, fetchPageMissingMedia, and usePageMissingMedia hook"
```

---

## Task 5: Version-history modal warns before reverting

**Files:**
- Modify: `client/src/pages/AdminPageEditorPage/components/PageVersionHistoryModal.tsx`
- Modify: `client/src/pages/AdminPageEditorPage/components/PageVersionHistoryModal.test.tsx`
- Modify: `client/src/admin.css`

**Interfaces:**
- Consumes: `PageVersion.missingMedia` (Task 4).
- Produces: no new exports — this is a leaf UI component.

- [ ] **Step 1: Update the failing tests**

In `client/src/pages/AdminPageEditorPage/components/PageVersionHistoryModal.test.tsx`, add `missingMedia: []` to both existing fixtures in the `versions` array (required by the `PageVersion` type now):

```ts
const versions: PageVersion[] = [
  {
    id: 'v2',
    pageId: 'p1',
    title: 'Sobre (mais recente)',
    layout: { version: 2, sections: [] },
    publishedAt: '2026-08-20T12:00:00.000Z',
    actorName: 'Ana',
    actorEmail: 'ana@example.com',
    missingMedia: []
  },
  {
    id: 'v1',
    pageId: 'p1',
    title: 'Sobre (mais antiga)',
    layout: { version: 2, sections: [] },
    publishedAt: '2026-08-01T12:00:00.000Z',
    actorName: 'Bruno',
    actorEmail: 'bruno@example.com',
    missingMedia: []
  }
];
```

Add a new test at the end of the `describe('PageVersionHistoryModal', ...)` block:

```ts
  it('shows a warning for a version with missing media and reflects it in the confirm dialog', () => {
    const versionsWithMissing: PageVersion[] = [
      versions[0],
      { ...versions[1], missingMedia: [{ blockId: 'b1', mediaId: 'm1' }] }
    ];
    vi.spyOn(usePagesModule, 'usePageVersions').mockReturnValue(
      { data: versionsWithMissing, isLoading: false } as unknown as ReturnType<typeof usePagesModule.usePageVersions>
    );
    vi.spyOn(usePagesModule, 'useRevertPageVersion').mockReturnValue(
      { mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof usePagesModule.useRevertPageVersion>
    );

    render(wrapper(<PageVersionHistoryModal isOpen pageId="p1" onClose={vi.fn()} onReverted={vi.fn()} />));

    expect(screen.getByText('⚠ 1 imagem desta versão não existe mais')).toBeInTheDocument();

    const revertButtons = screen.getAllByRole('button', { name: 'Reverter' });
    fireEvent.click(revertButtons[1]); // versão mais antiga, a com missingMedia

    const dialogs = screen.getAllByRole('dialog');
    const confirmDialog = dialogs[dialogs.length - 1];
    expect(within(confirmDialog).getByText(/precisará ser reenviada depois de reverter/)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the tests to verify the new one fails**

Run: `cd client && npx vitest run src/pages/AdminPageEditorPage/components/PageVersionHistoryModal.test.tsx`
Expected: the two pre-existing tests still PASS (fixtures now valid); the new test FAILS — no warning text rendered yet, confirm description is the static string.

- [ ] **Step 3: Implement**

Replace the full contents of `client/src/pages/AdminPageEditorPage/components/PageVersionHistoryModal.tsx`:

```tsx
import { useState } from 'react';
import { Modal, ConfirmModal } from '@/components/AdminUI';
import { usePageVersions, useRevertPageVersion } from '@/hooks/queries/usePages';
import type { Page } from '@/types';

type PageVersionHistoryModalProps = {
  isOpen: boolean;
  pageId: string | undefined;
  onClose: () => void;
  onReverted: (page: Page) => void;
};

const formatPublishedAt = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function missingMediaWarning(count: number): string {
  if (count === 1) return '⚠ 1 imagem desta versão não existe mais';
  return `⚠ ${count} imagens desta versão não existem mais`;
}

function confirmDescriptionFor(missingCount: number): string {
  const base = 'O conteúdo atual será substituído por esta versão e ela será publicada imediatamente.';
  if (missingCount === 0) return base;
  const plural = missingCount > 1;
  return `${base} Atenção: ${missingCount} imagem${plural ? 'ns' : ''} desta versão não existe${plural ? 'm' : ''} mais e precisar${plural ? 'ão' : 'á'} ser reenviada${plural ? 's' : ''} depois de reverter.`;
}

export function PageVersionHistoryModal({ isOpen, pageId, onClose, onReverted }: PageVersionHistoryModalProps) {
  const { data: versions, isLoading } = usePageVersions(pageId, isOpen);
  const revertMutation = useRevertPageVersion();
  const [confirmVersionId, setConfirmVersionId] = useState<string | null>(null);

  const confirmVersion = versions?.find((v) => v.id === confirmVersionId);
  const confirmDescription = confirmDescriptionFor(confirmVersion?.missingMedia.length ?? 0);

  const handleConfirmRevert = () => {
    if (!pageId || !confirmVersionId) return;
    revertMutation.mutate(
      { pageId, versionId: confirmVersionId },
      {
        onSuccess: (page) => {
          setConfirmVersionId(null);
          onReverted(page);
          onClose();
        }
      }
    );
  };

  return (
    <>
      <Modal isOpen={isOpen} title="Histórico de versões" description="Últimas publicações desta página" onClose={onClose} width={560}>
        {isLoading && <p className="muted">Carregando histórico...</p>}
        {!isLoading && (!versions || versions.length === 0) && (
          <p className="muted">Nenhuma versão publicada ainda.</p>
        )}
        {!isLoading && versions && versions.length > 0 && (
          <ul className="page-version-history-list">
            {versions.map((version) => (
              <li key={version.id} className="page-version-history-item">
                <div>
                  <strong>{version.title}</strong>
                  <div className="muted">
                    {formatPublishedAt(version.publishedAt)} · {version.actorName}
                  </div>
                  {version.missingMedia.length > 0 && (
                    <div className="page-version-history-warning">
                      {missingMediaWarning(version.missingMedia.length)}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setConfirmVersionId(version.id)}
                >
                  Reverter
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!confirmVersionId}
        title="Reverter para esta versão?"
        description={confirmDescription}
        confirmLabel="Reverter"
        onClose={() => setConfirmVersionId(null)}
        onConfirm={handleConfirmRevert}
        loading={revertMutation.isPending}
      />
    </>
  );
}
```

- [ ] **Step 4: Add the warning style**

In `client/src/admin.css`, add right after the existing `.page-version-history-item { ... }` block (around line 6339):

```css
.page-version-history-warning {
  color: #c0392b;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd client && npx vitest run src/pages/AdminPageEditorPage/components/PageVersionHistoryModal.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/AdminPageEditorPage/components/PageVersionHistoryModal.tsx client/src/pages/AdminPageEditorPage/components/PageVersionHistoryModal.test.tsx client/src/admin.css
git commit -m "feat(client): warn about missing media before confirming a page version revert"
```

---

## Task 6: Highlight blocks with missing media in the editor canvas

**Files:**
- Modify: `client/src/pages/AdminPageEditorPage/components/EditableBlock.tsx`
- Modify: `client/src/pages/AdminPageEditorPage/components/SectionEditor.tsx`
- Modify: `client/src/pages/AdminPageEditorPage/index.tsx`
- Modify: `client/src/admin.css`

**Interfaces:**
- Consumes: `usePageMissingMedia` (Task 4).
- Produces: `EditableBlock` gains prop `hasBrokenMedia?: boolean`; `SectionEditor` gains prop `brokenMediaBlockIds?: Set<string>` — no exports consumed outside this component tree.

No new automated test for this task: `EditableBlock`/`SectionEditor` have no existing test files (this codebase doesn't unit-test the drag/drop canvas components — see the existing test suite for `AdminPageEditorPage`), so this task is verified by the manual smoke test in Task 7. Keep the change small and mechanical to limit risk.

- [ ] **Step 1: Add the prop and badge to `EditableBlock`**

Replace the full contents of `client/src/pages/AdminPageEditorPage/components/EditableBlock.tsx`:

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen } from '@fortawesome/free-solid-svg-icons';
import { IconButton } from '@/components/AdminUI';
import { PageBlockView } from '@/components/PageRenderer';
import { blockRegistry } from '@/blocks/registry';
import { BlockActionsDropdown } from './BlockActionsDropdown';
import type { BlockType, PageBlock } from '@/types';

export function EditableBlock(_props: {
  block: PageBlock;
  isSelected: boolean;
  hasBrokenMedia?: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveColumn: () => void;
  onToggleVisible: () => void;
  onAddSide: () => void;
  canAddSide: boolean;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
}) {
  const {
    block,
    isSelected,
    hasBrokenMedia,
    onSelect,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    onMoveColumn,
    onToggleVisible,
    onAddSide,
    canAddSide,
    disableMoveUp,
    disableMoveDown
  } = _props;

  const label = blockRegistry[block.type as BlockType]?.label ?? block.type;
  const isHero = block.type === 'hero';
  const isHidden = block.visible === false;

  return (
    <div
      className={`editable-block${isSelected ? ' is-selected' : ''}${isHidden ? ' is-hidden' : ''}${hasBrokenMedia ? ' has-broken-media' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect();
      }}
    >
      <span className="editable-block-label">{label}{isHidden ? ' · oculto' : ''}</span>

      {hasBrokenMedia && (
        <span className="editable-block-media-warning" title="Uma imagem deste bloco não existe mais — reenvie a imagem.">
          ⚠ Imagem indisponível
        </span>
      )}

      <div className="editable-block-toolbar" onClick={(e) => e.stopPropagation()}>
        <IconButton icon="edit" label="Editar" tone="info" onClick={onSelect} />
        {!isHero && (
          <>
            <IconButton icon="arrow-up" label="Mover para cima" onClick={onMoveUp} disabled={disableMoveUp} />
            <IconButton icon="arrow-down" label="Mover para baixo" onClick={onMoveDown} disabled={disableMoveDown} />
            <IconButton
              icon={isHidden ? 'eye-off' : 'eye'}
              label={isHidden ? 'Mostrar bloco' : 'Ocultar bloco'}
              onClick={onToggleVisible}
            />
            <BlockActionsDropdown
              onDuplicate={onDuplicate}
              onMoveColumn={onMoveColumn}
              onDelete={onDelete}
              canAddSide={canAddSide}
              onAddSide={onAddSide}
            />
          </>
        )}
      </div>

      <div className="editable-block-body">
        <PageBlockView block={block} enableFormSubmit={false} />
      </div>

      {isSelected && (
        <button
          type="button"
          className="editable-block-edit-fab"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          title="Editar bloco"
          aria-label="Editar bloco"
        >
          <FontAwesomeIcon icon={faPen} />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Thread the prop through `SectionEditor`**

In `client/src/pages/AdminPageEditorPage/components/SectionEditor.tsx`, add `brokenMediaBlockIds?: Set<string>;` to the props type, right after the `selectedBlockId?: string | null;` line (line 56):

```ts
  selectedBlockId?: string | null;
  brokenMediaBlockIds?: Set<string>;
```

Destructure it alongside `selectedBlockId` (line 78):

```ts
    selectedBlockId,
    brokenMediaBlockIds,
```

Pass it into `EditableBlock` (inside the `sortedBlocks.map` callback, alongside `isSelected`):

```tsx
                            <EditableBlock
                              block={block}
                              isSelected={selectedBlockId === block.id}
                              hasBrokenMedia={brokenMediaBlockIds?.has(block.id) ?? false}
                              onSelect={() => onEditBlock(colIndex, block, blockIdx)}
```

- [ ] **Step 3: Compute the set and pass it down in `AdminPageEditorPage`**

In `client/src/pages/AdminPageEditorPage/index.tsx`, add `useMemo` to the React import (line 1):

```ts
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
```

Add the hook import alongside the existing `usePageValidation` import:

```ts
import { usePageMissingMedia } from '@/hooks/queries/usePages';
```

Add, right after the `const { errors: validationErrors, ... } = usePageValidation(page);` line:

```ts
  const { data: missingMedia } = usePageMissingMedia(page.id, !!page.id);
  const brokenMediaBlockIds = useMemo(
    () => new Set((missingMedia ?? []).map((m) => m.blockId)),
    [missingMedia]
  );
```

Pass it to `SectionEditor` (inside the `page.layout.sections.map` render, alongside `selectedBlockId={selectedBlockId}`):

```tsx
                      selectedBlockId={selectedBlockId}
                      brokenMediaBlockIds={brokenMediaBlockIds}
```

- [ ] **Step 4: Add the badge style**

In `client/src/admin.css`, add right after the existing `.editable-block.is-hidden { opacity: 0.5; }` line (around line 5569):

```css
.editable-block.has-broken-media { outline-color: #c0392b; }

.editable-block-media-warning {
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  z-index: 4;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: #c0392b;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  pointer-events: none;
}
```

- [ ] **Step 5: Typecheck**

Run: `cd client && npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Run the full client test suite**

Run: `cd client && npx vitest run`
Expected: PASS — no existing test constructs `SectionEditor`/`EditableBlock` directly with a positional/strict props check that the new optional props would break (both are optional, additive).

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/AdminPageEditorPage/components/EditableBlock.tsx client/src/pages/AdminPageEditorPage/components/SectionEditor.tsx client/src/pages/AdminPageEditorPage/index.tsx client/src/admin.css
git commit -m "feat(client): highlight editor blocks whose media no longer exists"
```

---

## Task 7: Full-suite verification and manual smoke test

**Files:** none (verification only)

- [ ] **Step 1: Root-level gates**

Run: `npm run typecheck && npm run lint && npm test` (from the repo root)
Expected: all three exit 0.

- [ ] **Step 2: Manual smoke test against a running instance**

Run `npm run dev` from the repo root, logged in as the seeded admin:

1. Open a normal page (or the home) in the editor, add an `image` block, pick a real uploaded media, save, then publish (if not the home).
2. Go to Mídia, delete that same image.
3. Reopen the page's editor — confirm the image block shows the "⚠ Imagem indisponível" badge without any manual action (this exercises `GET /admin/pages/:id/missing-media` on load, not just the revert path).
4. Open "Histórico" — confirm the version that still references the deleted image shows "⚠ 1 imagem desta versão não existe mais" in the list.
5. Click "Reverter" on that version — confirm the dialog's description mentions the missing image and that reenviar will be needed. Confirm the revert.
6. Confirm the page republishes normally (no error) and the editor still shows the block highlighted after the revert completes.
7. Replace the image in that block with a valid one and save — confirm the badge disappears without needing to close and reopen the editor (query invalidation from `useUpdatePage`/`usePublishPage`).
8. Repeat steps 1–3 for the Home page specifically (`/admin` home editor) to confirm the generic `:id` route resolves correctly for the reserved home page too.

Stop the dev server when done.

- [ ] **Step 3: Update the audit artifact (optional, only if the user asks)**

No automatic action here — this task is a verification checkpoint, not new scope.
