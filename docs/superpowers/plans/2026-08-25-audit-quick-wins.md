# Audit Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the four "quick wins" from the CMS template audit (health check, CI gates, structured logging, error tracking), and — as a prerequisite for the CI lint gate — bring `client/` to zero ESLint errors, including 25 findings that require real behavior-preserving refactors.

**Architecture:** Each risky lint fix reuses one of four verified-safe patterns instead of a one-off hack per site: (B) a `useSyncExternalStore`-based `useHasMounted()` hook replaces the "mounted flag set in an effect" idiom; (A) local draft state moves into a component keyed by the editing target's id, replacing a reset-effect with a natural remount; (C) React's documented "render-time adjust" pattern (`useState` mirror of the previous prop value, compared and corrected synchronously during render, never inside an effect) replaces "sync local state from a query/prop" effects; and a `useReducer`-carried length pair replaces raw ref reads in `usePageHistory`'s render path. One finding (dnd-kit's `useSortable()`) is a documented false positive against a third-party API and gets a scoped, commented `eslint-disable`, matching this codebase's existing convention for justified exceptions.

**Tech Stack:** Express 5 + TypeScript + Prisma (server), React 19 + Vite + TypeScript strict + React Query (client), vitest, ESLint 9 flat config, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-25-audit-quick-wins.md`

## Global Constraints

- No `console.log`/`console.*` left in server production code (existing CLAUDE.md convention) — enforced by the new logger + a `no-console` ESLint rule on `server/`.
- No `window.confirm`/`window.prompt` — n/a to this plan, not touched.
- TypeScript strict, no unexplained `any`.
- `SENTRY_DSN` / `VITE_SENTRY_DSN` optional — graceful degradation, same shape as the existing Redis/storage pattern.
- Never silence a real lint finding with `eslint-disable` — fix it. The one exception (dnd-kit) must carry a comment explaining why it's a false positive.
- `/api/health` must keep responding `200` for the already-healthy case — `lighthouse-ci.yml` polls it via `wait-on` before running Lighthouse.

---

## Task 1: `/api/health` — DB + Redis status

**Files:**
- Modify: `server/src/app.ts:93`
- Test: `server/src/app.test.ts` (new)

**Interfaces:**
- Consumes: `prisma` from `server/src/config/prisma.ts`, `isRedisHealthy()` from `server/src/config/redis.ts` (already exists), `sendSuccess` from `server/src/utils/responses.ts`.
- Produces: `GET /api/health` → `200 { data: { status: 'ok'|'degraded', db: 'ok'|'error', redis: 'ok'|'disabled'|'error' }, error: null }` when DB is reachable; `503` with `status: 'error'` when DB is not (Redis is optional/degradable and never fails the overall status, matching the app's existing graceful-degradation stance on Redis).

- [ ] Write `server/src/app.test.ts` using `supertest` against the exported `app`— check `server/package.json` devDependencies first; if `supertest` isn't present, add it (`npm install -D supertest @types/supertest --prefix server`). Test: mocks `prisma.$queryRaw` (via `vi.mock('./config/prisma')`) to resolve → expect 200 and `data.db === 'ok'`; mocks it to reject → expect 503 and `data.db === 'error'`; mocks `isRedisHealthy` to resolve `false` → expect `data.redis === 'error'` but status still 200 (given DB ok).
- [ ] Replace `app.get('/api/health', (_req, res) => sendSuccess(res, { status: 'ok' }));` with an async handler that runs `prisma.$queryRaw\`SELECT 1\`` and `isRedisHealthy()` (guard: only call `isRedisHealthy` if `env.REDIS_URL` is set, else report `'disabled'`), and returns the shape above via `sendSuccess`/`res.status(503).json(...)`.
- [ ] Run `npm test --prefix server` — new test passes, existing 25 still pass.
- [ ] Commit: `feat: report DB/Redis status from /api/health`

---

## Task 2: Shared `useHasMounted` hook (Pattern B)

**Files:**
- Create: `client/src/hooks/useHasMounted.ts`
- Modify: `client/src/components/AdminUI.tsx` (`Modal` ~line 21-24, `NavDrawer` ~line 303-306)
- Modify: `client/src/components/Toast.tsx` (`Toaster` ~line 92-94)

**Interfaces:**
- Produces: `useHasMounted(): boolean` — `false` during SSR and the initial client render, `true` after hydration, without ever calling `setState` inside a `useEffect`.

- [ ] Create the hook:
```tsx
import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

export function useHasMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
```
- [ ] In `AdminUI.tsx`, in `Modal`, replace:
```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted || !isOpen) return null;
```
with:
```tsx
const mounted = useHasMounted();
if (!mounted || !isOpen) return null;
```
Same replacement in `NavDrawer`. Remove the now-unused `useState`/`useEffect` imports if nothing else in the file needs them (check before removing).
- [ ] In `Toast.tsx`, in `Toaster`, apply the same replacement.
- [ ] Run `npm test --prefix client` — 77 tests still pass (Modal/Toast render behavior unchanged: `useSyncExternalStore`'s server snapshot is `false`, matching the old pre-mount `useState(false)` initial value exactly).
- [ ] Commit: `refactor: replace mounted-flag effects with useHasMounted (useSyncExternalStore)`

---

## Task 3: Key-based remount for modal drafts (Pattern A)

**Files:**
- Modify: `client/src/blocks/hero/Form.tsx` (`NestedBlockEditorModal`, ~line 179-220)
- Modify: `client/src/pages/AdminPageEditorPage/components/BlockEditorModal.tsx` (~line 62-100)
- Modify: `client/src/pages/AdminPageEditorPage/components/MoveBlockModal.tsx`

**Interfaces:**
- No external interface change — same props in, same `onSave`/`onConfirm`/`onClose` callbacks out. Internal-only restructure.

Both `hero/Form.tsx`'s `NestedBlockEditorModal` and `BlockEditorModal.tsx` are rendered unconditionally by their parents (confirmed: `<BlockEditorModal state={...} .../>` at `AdminPageEditorPage/index.tsx:334` always renders, `state` is `null` when closed) — so the component holding `draft`/`selectedType`/`error` never unmounts on its own, which is why a reset-effect exists today. Moving that state into an inner component rendered as `<Modal>`'s child, keyed by the block id being edited, gets a fresh instance (and fresh initial state) for free whenever the target changes — no effect needed.

- [ ] In `BlockEditorModal.tsx`, split into an outer shell and inner form:
```tsx
export function BlockEditorModal(_props: {
  state: BlockModalState | null;
  onClose: () => void;
  onSave: (draft: BlockDraft) => void;
  onUploadingChange?: (uploading: boolean) => void;
  columnCount?: number;
}) {
  const { state, onClose, onSave, onUploadingChange, columnCount = 2 } = _props;
  return (
    <Modal isOpen={!!state?.open} onClose={onClose} /* ...existing title/description/width props... */>
      <BlockEditorModalContent
        key={`${state?.block?.id ?? 'new'}:${state?.mode ?? ''}`}
        state={state}
        onClose={onClose}
        onSave={onSave}
        onUploadingChange={onUploadingChange}
        columnCount={columnCount}
      />
    </Modal>
  );
}

function BlockEditorModalContent({ state, onClose, onSave, onUploadingChange, columnCount }: {
  state: BlockModalState | null;
  onClose: () => void;
  onSave: (draft: BlockDraft) => void;
  onUploadingChange?: (uploading: boolean) => void;
  columnCount: number;
}) {
  const initialDraft = toBlockDraft(state?.block);
  const [draft, setDraft] = useState<BlockDraft | null>(initialDraft);
  const [selectedType, setSelectedType] = useState<PageBlock['type'] | null>(initialDraft?.type ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  // ...rest of the existing body (handleSelectType, handleSave, JSX) unchanged, minus the
  // removed `useEffect(() => { setDraft(initialDraft); ... }, [state?.block?.id, state?.open])`.
}
```
Read the actual file for the full existing JSX/handler body before editing — the snippet above only shows the parts that change (the split point and the removed effect); everything else in the component moves into `BlockEditorModalContent` verbatim.
- [ ] Apply the identical split to `hero/Form.tsx`'s `NestedBlockEditorModal` (outer keeps `<Modal isOpen={!!state?.open}>`, inner `NestedBlockEditorForm` keyed by `` `${state?.block?.id ?? 'new'}:${state?.open ? 1 : 0}` `` holds `draft`/`selectedType`/`error`, effect removed).
- [ ] In `MoveBlockModal.tsx`, same split: outer renders `<Modal isOpen={!!state?.open}>`, inner `MoveBlockModalContent` (keyed by `state?.columnIndex ?? 'none'`) takes `initialColumn={state?.columnIndex ?? 0}` and owns `const [target, setTarget] = useState(initialColumn)` — no effect.
- [ ] Run `npm test --prefix client` — check for existing tests covering these three components specifically (`Grep` for `BlockEditorModal|NestedBlockEditorModal|MoveBlockModal` under `client/src/**/*.test.tsx`) and confirm they still pass; if none exist, manually smoke-test in the running app (open the page editor, add/edit a block, switch between editing two different blocks without closing, confirm the draft resets correctly each time; same for "move to column").
- [ ] Commit: `refactor: key-remount modal drafts instead of resetting via effect`

---

## Task 4: Render-time-adjust pattern (Pattern C)

**Files:**
- Modify: `client/src/components/ImagePickerModal.tsx` (~line 45-54)
- Modify: `client/src/pages/AdminArticleEditorPage/hooks/useArticleEditor.ts` (~line 38-46)
- Modify: `client/src/pages/AdminBlogPage.tsx` (~line 37-41)
- Modify: `client/src/pages/AdminNavbarPage.tsx` (~line 63-65)
- Modify: `client/src/pages/AdminPageEditorPage/hooks/useBlockManager.ts` (~line 64-66)
- Modify: `client/src/pages/AdminSettingsPage.tsx` (`WhatsAppFloatingCard`, ~line 280-284)
- Modify: `client/src/pages/ArticlePage.tsx` (~line 16-20)
- Modify: `client/src/pages/BlogPage.tsx` (~line 36-38)

**Interfaces:** No external interface changes anywhere in this task — every fix is a same-file, same-behavior internal restructure.

Each site follows [React's documented pattern](https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes) for "adjust state when an input changes" without an effect: track the previous value of the triggering input in its own `useState`, compare during render, and call the target setter synchronously in the render body (not inside `useEffect`) when it differs. This is React-sanctioned (the effect-detection lint rule only flags `setState` textually inside a `useEffect`/`useLayoutEffect` callback) and produces an identical extra-render-then-settle timing to the effect version it replaces.

- [ ] `BlogPage.tsx` — replace:
```tsx
useEffect(() => {
  setPage(1);
}, [search]);
```
with:
```tsx
const [prevSearch, setPrevSearch] = useState(search);
if (search !== prevSearch) {
  setPrevSearch(search);
  setPage(1);
}
```
- [ ] `ArticlePage.tsx` — replace the effect at line 16-20 with:
```tsx
const [prevViews, setPrevViews] = useState(article?.views);
if (article?.views !== prevViews) {
  setPrevViews(article?.views);
  if (article?.views !== undefined) {
    setViewCount(article.views);
  }
}
```
- [ ] `AdminSettingsPage.tsx` (`WhatsAppFloatingCard`) — replace:
```tsx
useEffect(() => {
  if (!enabled) {
    setIsExpanded(false);
  }
}, [enabled]);
```
with:
```tsx
const [prevEnabled, setPrevEnabled] = useState(enabled);
if (enabled !== prevEnabled) {
  setPrevEnabled(enabled);
  if (!enabled) setIsExpanded(false);
}
```
- [ ] `useBlockManager.ts` — replace:
```tsx
useEffect(() => {
  if (!blockModal) setHasUploading(false);
}, [blockModal]);
```
with:
```tsx
const [prevBlockModal, setPrevBlockModal] = useState(blockModal);
if (blockModal !== prevBlockModal) {
  setPrevBlockModal(blockModal);
  if (!blockModal) setHasUploading(false);
}
```
- [ ] `AdminNavbarPage.tsx` — replace:
```tsx
useEffect(() => {
  if (items) setNavItems(items);
}, [items]);
```
with:
```tsx
const [prevItems, setPrevItems] = useState(items);
if (items !== prevItems) {
  setPrevItems(items);
  if (items) setNavItems(items);
}
```
- [ ] `AdminBlogPage.tsx` — replace:
```tsx
useEffect(() => {
  if (data) {
    setForm({ id: data.id, title: data.title, description: data.description, sections: data.sections });
  }
}, [data]);
```
with:
```tsx
const [prevData, setPrevData] = useState(data);
if (data !== prevData) {
  setPrevData(data);
  if (data) {
    setForm({ id: data.id, title: data.title, description: data.description, sections: data.sections });
  }
}
```
- [ ] `useArticleEditor.ts` — replace:
```tsx
useEffect(() => {
  if (current) {
    setArticle({
      ...current,
      isFeatured: current.isFeatured ?? false
    });
    setTagsText(current.tags?.join(', ') ?? '');
  }
}, [current?.id]);
```
with:
```tsx
const [prevCurrentId, setPrevCurrentId] = useState(current?.id);
if (current?.id !== prevCurrentId) {
  setPrevCurrentId(current?.id);
  if (current) {
    setArticle({
      ...current,
      isFeatured: current.isFeatured ?? false
    });
    setTagsText(current.tags?.join(', ') ?? '');
  }
}
```
- [ ] `ImagePickerModal.tsx` — replace:
```tsx
useEffect(() => {
  if (!open) {
    setTab('library');
    setSearchQuery('');
    setActiveTag(null);
    setUploadFile(null);
    setUploadPreview(null);
    setIsDragging(false);
  }
}, [open]);
```
with:
```tsx
const [prevOpen, setPrevOpen] = useState(open);
if (open !== prevOpen) {
  setPrevOpen(open);
  if (!open) {
    setTab('library');
    setSearchQuery('');
    setActiveTag(null);
    setUploadFile(null);
    setUploadPreview(null);
    setIsDragging(false);
  }
}
```
- [ ] Run `npm test --prefix client` after all eight — 77 tests pass. Manually smoke-test the blog search pagination reset and the WhatsApp settings card collapse (the two with the least test coverage).
- [ ] Commit: `refactor: replace state-sync effects with render-time adjustment`

---

## Task 5: `usePageValidation.ts` — derive instead of store

**Files:**
- Modify: `client/src/hooks/usePageValidation.ts`

**Interfaces:**
- Produces (unchanged from caller's perspective): `{ errors, fieldStates, imageStates, markFieldTouched, getCharCount, validateForPublication }`. `runValidation` is removed from the return value — confirmed unused by its only consumer (`AdminPageEditorPage/index.tsx:67` destructures `errors, fieldStates, markFieldTouched, validateForPublication`, not `runValidation`).

`errors`/`fieldStates` are pure functions of `page` + `touchedFields` (verified: `validatePageFields`/`validateBlocks` close only over those, `validateForPublication` already recomputes them independently rather than relying on stored state) — they don't need to be `useState` at all.

- [ ] Remove `errors`/`fieldStates` from the `ValidationState` type and the `useState` initial value — `state` now holds only `imageStates`.
- [ ] Add, near the top of the hook (after `validatePageFields`/`validateBlocks` are defined):
```tsx
const pageValidation = useMemo(() => validatePageFields(), [validatePageFields]);
const blockValidation = useMemo(() => validateBlocks(), [validateBlocks]);
const errors = useMemo(
  () => [...pageValidation.errors, ...blockValidation.errors],
  [pageValidation, blockValidation]
);
const fieldStates = useMemo(
  () => ({ ...pageValidation.fieldStates, ...blockValidation.fieldStates }),
  [pageValidation, blockValidation]
);
```
- [ ] Replace the `runValidation` callback and its effect:
```tsx
const runValidation = useCallback(() => { /* ... */ }, [...]);

useEffect(() => {
  runValidation();
  return () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };
}, [runValidation]);
```
with just:
```tsx
useEffect(() => {
  validateImages();
  return () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };
}, [validateImages]);
```
(`validateImages` itself only synchronously schedules a `setTimeout`; every `setState` inside it runs inside that timeout callback, so this effect has no synchronous `setState` in its body and isn't flagged.)
- [ ] Update the `return` statement: `errors: state.errors` → `errors`, `fieldStates: state.fieldStates` → `fieldStates`, drop `runValidation` from the returned object.
- [ ] Run `npm test --prefix client` — check for `usePageValidation.test.ts`/`.tsx` first; if present it must still pass. If not present, manually smoke-test: open the page editor, leave the title blank, confirm the "Titulo obrigatorio" error still appears/disappears correctly as you type, and that broken-image detection still marks fields on publish attempt.
- [ ] Commit: `refactor: derive page validation state instead of syncing via effect`

---

## Task 6: Two special cases — dead state, redundant reset

**Files:**
- Modify: `client/src/components/AnimatedCounter.tsx`
- Modify: `client/src/components/RichTextEditor/hooks/useLinkManager.ts`
- Modify: `client/src/components/RichTextEditor/RteLinkPopover.tsx`

**Interfaces:** No change.

- [ ] `AnimatedCounter.tsx`: the effect's first line, `setDisplayValue(0)`, is redundant — the `animate` rAF callback it starts always computes `progress = 0` (hence `current = 0`) on its own first invocation (`elapsed = currentTime - startTimeRef.current = 0` since `startTimeRef.current` is set to `currentTime` on that same first call). Delete the `setDisplayValue(0);` line; keep `startTimeRef.current = null;` and the rest of the effect as-is.
- [ ] `useLinkManager.ts`: verified `isMeasuring` is read only in `RteLinkPopover.tsx` as `opacity: isMeasuring || !linkAnchorRect ? 0 : 1` — and because `setIsMeasuring(true)` and `setIsMeasuring(false)` both run synchronously within the same `useLayoutEffect` invocation (React batches them; no paint happens between), `isMeasuring` is never observably `true` to a consumer — `!linkAnchorRect` alone already covers "not yet positioned" (it starts `null`). Remove `isMeasuring` entirely: delete `const [isMeasuring, setIsMeasuring] = useState(false)`, the two `setIsMeasuring(...)` calls in the `useLayoutEffect`, and `isMeasuring` from the hook's returned object. In `RteLinkPopover.tsx`, remove `isMeasuring` from the destructured hook result and simplify both ternaries to `!linkAnchorRect ? 0 : 1` / `!linkAnchorRect ? 'none' : 'auto'`.
- [ ] Run `npm test --prefix client`, and manually smoke-test: dashboard stat counters animate on load; clicking a link in the rich text editor still opens the popover positioned correctly (no visible flash).
- [ ] Commit: `refactor: remove dead isMeasuring flag and redundant counter reset`

---

## Task 7: `usePageHistory`/`usePageEditor` — stop reading refs during render

**Files:**
- Modify: `client/src/pages/AdminPageEditorPage/hooks/usePageHistory.ts`
- Modify: `client/src/pages/AdminPageEditorPage/hooks/usePageEditor.ts`

**Interfaces:** No change to either hook's public return shape (`{ undo, redo, canUndo, canRedo }` / includes `isDirty`).

`usePageHistory` already manually forces a re-render (`force()`) after every mutation of `pastRef`/`futureRef`; the two lengths it wants are known at every one of those mutation sites. Instead of reading `.current.length` in the render path, carry the lengths in the same reducer already used to force re-renders.

- [ ] In `usePageHistory.ts`, replace:
```tsx
const [, force] = useReducer((x: number) => x + 1, 0);
```
with:
```tsx
const [{ pastLength, futureLength }, setLengths] = useReducer(
  (_state: { pastLength: number; futureLength: number }, _action: void) => ({
    pastLength: pastRef.current.length,
    futureLength: futureRef.current.length
  }),
  { pastLength: 0, futureLength: 0 }
);
```
- [ ] Replace every `force()` call site (in the effect, in `undo`, in `redo`) with `setLengths()` — same call sites, same order relative to the ref mutations (call it last, after `pastRef.current`/`futureRef.current` have their final values for that operation, exactly where `force()` was called).
- [ ] Replace the return statement's `canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0` with `canUndo: pastLength > 0, canRedo: futureLength > 0`.
- [ ] In `usePageEditor.ts`, convert `savedSnapshotRef` (a `useRef<string>`) to real state: `const [savedSnapshot, setSavedSnapshot] = useState<string>(serializeForDirty(emptyPage));`. Replace all three `savedSnapshotRef.current = serializeForDirty(...)` assignments (lines ~95, ~140, ~171) with `setSavedSnapshot(serializeForDirty(...))`. Replace line 208's `const isDirty = serializeForDirty(page) !== savedSnapshotRef.current;` with `const isDirty = serializeForDirty(page) !== savedSnapshot;`.
- [ ] Run `npx eslint .` in `client/` — confirm no new finding appeared on the effect at `usePageEditor.ts:67-97` that already calls `setPage(loaded)` synchronously (it wasn't flagged before this change and shouldn't be after; this task only adds a second `setState` call, `setSavedSnapshot`, to that same already-unflagged effect body). If it newly flags that effect, apply the Task 4 render-time-adjust pattern there too (track `prevExistingPageId`).
- [ ] Run `npm test --prefix client` and manually smoke-test undo/redo (multiple edits, undo twice, redo once, confirm button disabled-state and layout match) and the page editor's dirty/unsaved-changes indicator.
- [ ] Commit: `refactor: carry undo/redo lengths and saved-snapshot in state, not refs read during render`

---

## Task 8: `NavigationTree.tsx` — narrow the render-prop, justify the rest

**Files:**
- Modify: `client/src/components/navigation/NavigationTree.tsx`

**Interfaces:**
- `SortableItem`'s `children` prop changes from `(props: ReturnType<typeof useSortable>) => React.ReactNode` to `(props: { listeners: ReturnType<typeof useSortable>['listeners']; attributes: ReturnType<typeof useSortable>['attributes']; isDragging: boolean }) => React.ReactNode` — verified these three fields are the only ones read from the callback argument at both call sites (`NavigationItemRow`'s `dragListeners`/`dragAttributes`/`isDragging` props, lines ~176-178 and ~216-218).

`SortableItem` itself calling `ref={sortable.setNodeRef}` and reading `sortable.transform`/`sortable.transition` in its own render is dnd-kit's documented, canonical `useSortable()` usage — the same shape as dnd-kit's own examples. There is no restructure that avoids this while still using the library as intended; `eslint-plugin-react-hooks` v7's `refs` rule flags it as a conservative false positive because `useSortable()`'s return type mixes a ref-setter with plain values. The one part that *is* fixable without a disable comment is `{children(sortable)}` passing the *entire* object (including the ref-setter) further out through a render-prop boundary — narrow that to the three primitive fields the caller actually uses.

- [ ] Change `SortableItem`'s type signature and body:
```tsx
function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (props: {
    listeners: ReturnType<typeof useSortable>['listeners'];
    attributes: ReturnType<typeof useSortable>['attributes'];
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const sortable = useSortable({ id });
  return (
    <div
      // eslint-disable-next-line react-hooks/refs -- dnd-kit's useSortable() must be read
      // in the same render that calls it (its documented API); there's no restructure that
      // avoids this while using the library as intended.
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
    >
      {children({ listeners: sortable.listeners, attributes: sortable.attributes, isDragging: sortable.isDragging })}
    </div>
  );
}
```
- [ ] Both call sites (`{(sortable) => (...)}` at line ~147 and `{(childSortable) => (...)}` at line ~207) already only destructure `.listeners`, `.attributes`, `.isDragging` off their parameter — no change needed there beyond the type now matching (TypeScript will confirm via `tsc -b`).
- [ ] Run `npx eslint .` in `client/` — confirm the finding count for `NavigationTree.tsx` drops from 5+1 (refs + unused-expressions, the latter fixed by the mechanical-fixes pass) to at most the single justified `eslint-disable` line (verify no other `refs` finding remains on `style={{...}}`/`transform`/`transition`/`children(...)` — if any do, extend the disable comment's scope or add narrower disables per the plan's "never silence without justification" rule, but expect none: those reads happen in the same statement/expression as the now-disabled `ref=` line's surrounding JSX element, which the rule treats as one finding per distinct read — if it emits separate findings per line, add one scoped, identically-commented disable per line rather than a block disable).
- [ ] Run `npm test --prefix client` and manually smoke-test drag-and-drop reordering of nav items (root level and nested/child level).
- [ ] Commit: `refactor: narrow NavigationTree's sortable render-prop, justify dnd-kit ref usage`

---

## Task 9: Verify `DynamicPage.tsx` bug fix and mechanical lint fixes

**Files:** (handled by a parallel worker — this task is a verification checkpoint, not new work)
- Verify: `client/src/pages/DynamicPage.tsx`
- Verify: all files touched by the mechanical-fixes pass (no-explicit-any, no-unused-vars, no-unused-expressions, prefer-const, ban-ts-comment, react-refresh/only-export-components)

- [ ] Confirm `useQuery` in `DynamicPage.tsx` is now called unconditionally on every render (the "should we even fetch" logic moved to the query's `enabled` option or an equivalent, not around the hook call).
- [ ] Run `npx tsc -b` in `client/` — passes clean.
- [ ] Run `npx eslint .` in `client/` — confirm zero errors remain (the only findings left in the raw list, if any, must be `exhaustive-deps` warnings, which don't fail the `lint` script).
- [ ] Run `npm test --prefix client` — 77 tests pass.
- [ ] Commit any residual fixups: `fix: address remaining lint findings`

---

## Task 10: CI gates — typecheck, lint, test on every PR

**Files:**
- Modify: `client/package.json` (add `"typecheck": "tsc -b"`)
- Modify: `server/package.json` (add `"typecheck": "tsc --noEmit"`, `"lint": "eslint src"`)
- Modify: `package.json` (root — add `"typecheck"` and `"lint"` scripts that fan out to both workspaces)
- Create: `server/eslint.config.js`
- Modify: `server/package.json` devDependencies (add `eslint`, `typescript-eslint`, `@eslint/js`, `globals` — same versions as `client/package.json`'s devDependencies for consistency)
- Create: `.github/workflows/ci.yml`

**Interfaces:** N/A — tooling only.

- [ ] Add to `client/package.json` scripts: `"typecheck": "tsc -b"`.
- [ ] Install server ESLint deps: `npm install -D eslint@^9.39.1 typescript-eslint@^8.46.4 @eslint/js@^9.39.1 globals@^16.5.0 --prefix server`.
- [ ] Create `server/eslint.config.js`:
```js
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      'no-console': 'error',
    },
  },
]);
```
(`no-console` is safe to turn on as an error here specifically because Task 11, structured logging, removes every remaining `console.*` call from `server/src` first — sequence this task after Task 11.)
- [ ] Add to `server/package.json` scripts: `"typecheck": "tsc --noEmit"`, `"lint": "eslint src"`.
- [ ] Add to root `package.json` scripts: `"typecheck": "npm run typecheck --prefix client && npm run typecheck --prefix server"`, `"lint": "npm run lint --prefix client && npm run lint --prefix server"`.
- [ ] Also add `argsIgnorePattern`/`varsIgnorePattern` to `client/eslint.config.js`'s `no-unused-vars` rule (see mechanical-fixes task) if not already done by that pass — cross-check before duplicating.
- [ ] Create `.github/workflows/ci.yml`, modeled on the existing `.github/workflows/lighthouse-ci.yml`'s trigger shape (same `paths:` filter, same `pull_request` branches) but without the Postgres service / build / Lighthouse steps — just install + gate:
```yaml
name: CI

on:
  pull_request:
    branches: [main, master]
    paths:
      - "client/**"
      - "server/**"
      - "server.js"
      - "package.json"
      - ".github/workflows/ci.yml"
  workflow_dispatch: {}

jobs:
  gates:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: |
            package-lock.json
            client/package-lock.json
            server/package-lock.json

      - name: Install root dependencies
        run: npm ci

      - name: Install server dependencies
        run: npm ci --prefix server

      - name: Install client dependencies
        run: npm ci --prefix client

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test
```
- [ ] Run `npm run typecheck && npm run lint && npm test` locally from the repo root — all three must exit 0 before this task is considered done (this is the actual gate the workflow enforces; run it locally first so CI isn't the first place a failure surfaces).
- [ ] Commit: `ci: add typecheck/lint/test gate for pull requests`

---

## Task 11: Structured logging (pino) — server

**Files:**
- Create: `server/src/config/logger.ts`
- Create: `server/src/middleware/requestId.ts`
- Modify: `server/src/app.ts` (wire request-id middleware, keep or replace `morgan`)
- Modify: `server/src/config/env.ts` (add `LOG_LEVEL`)
- Modify: `server/src/config/redis.ts` (3 `console.*` sites)
- Modify: `server/src/index.ts` (2 `console.*` sites)
- Modify: `server/src/infra/cache/RedisCacheProvider.ts` (3 `console.*` sites)
- Modify: `server/src/infra/storage/SupabaseStorageProvider.ts` (1 `console.*` site)
- Modify: `server/src/middleware/error.ts` (2 `console.*` sites)
- Modify: `server/src/prisma/seed.ts` (1 `console.*` site — seed script, still fine to log via pino for consistency)
- Test: `server/src/middleware/requestId.test.ts` (new)

**Interfaces:**
- Produces: `logger` (default export or named export `logger` from `server/src/config/logger.ts`) — a configured `pino` instance. `requestId` middleware attaches `req.id: string` (uuid v4) and sets response header `X-Request-Id`; also attaches `req.log` — a child logger with `{ requestId: req.id }` bound — so call sites with access to `req` log via `req.log.error(...)` and get the request-id automatically; call sites without a request in scope (boot-time logs in `index.ts`, `redis.ts`, `seed.ts`) use the base `logger` directly.

- [ ] Add dependency: `npm install pino --prefix server` (and `pino-pretty` as a dev dependency for readable local dev output: `npm install -D pino-pretty --prefix server`).
- [ ] Add `LOG_LEVEL: z.enum(['fatal','error','warn','info','debug','trace']).default('info')` to `envSchema` in `server/src/config/env.ts`.
- [ ] Create `server/src/config/logger.ts`:
```ts
import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
      : undefined
});
```
- [ ] Create `server/src/middleware/requestId.ts`:
```ts
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger';

declare module 'express-serve-static-core' {
  interface Request {
    id: string;
    log: typeof logger;
  }
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  req.id = uuidv4();
  req.log = logger.child({ requestId: req.id });
  res.set('X-Request-Id', req.id);
  next();
}
```
- [ ] Write `server/src/middleware/requestId.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { requestId } from './requestId';

function makeRes() {
  const headers: Record<string, string> = {};
  return { set: vi.fn((k: string, v: string) => { headers[k] = v; }), _headers: headers } as any;
}

describe('requestId', () => {
  it('assigns a uuid to req.id, sets X-Request-Id, and calls next', () => {
    const req = {} as any;
    const res = makeRes();
    const next = vi.fn();

    requestId(req, res, next);

    expect(req.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(req.log).toBeDefined();
    expect(res.set).toHaveBeenCalledWith('X-Request-Id', req.id);
    expect(next).toHaveBeenCalledWith();
  });

  it('assigns a different id on each call', () => {
    const req1 = {} as any;
    const req2 = {} as any;
    requestId(req1, makeRes(), vi.fn());
    requestId(req2, makeRes(), vi.fn());
    expect(req1.id).not.toBe(req2.id);
  });
});
```
- [ ] Run `npm test --prefix server` — new tests pass.
- [ ] In `app.ts`, add `app.use(requestId);` immediately after `app.use(cookieParser());` and before the `morgan` line (morgan's own access-log line stays as-is — it's a separate, already-working concern; this plan only replaces `console.*`, not the access-log middleware).
- [ ] Replace every `console.*` call listed in the Files section with the appropriate logger call: boot-time/module-scope call sites (`index.ts`, `redis.ts`, `seed.ts`) use `logger.error(...)`/`logger.info(...)`/`logger.warn(...)` (pino's call shape is `logger.error({ err }, 'message')` for structured error objects, or `logger.error('message', err)` — prefer the structured form: `logger.error({ err: error }, 'Failed to create Redis client')`); `middleware/error.ts` has `req` in scope (its signature currently ignores it as `_req` — rename to `req`) so use `req.log.error(...)` there instead of the module-level `logger`.
- [ ] Example for `middleware/error.ts` (signature and both `console.error` sites):
```ts
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    req.log.warn({ issues: err.issues }, 'Zod validation error');
    // ...unchanged...
  }
  // ...unchanged HttpError / Prisma branches...
  req.log.error({ err }, 'Unhandled error');
  return res.status(500).json({ data: null, error: { message: 'Internal server error' } });
}
```
(Zod validation errors move to `warn` — they're expected 400s, not incidents; this also keeps them out of Sentry in Task 12, which only reports the final `error`-level branch.)
- [ ] Run `npx tsc --noEmit` in `server/` — passes (the `declare module` augmentation must compile cleanly; if `express-serve-static-core` augmentation conflicts with an existing one elsewhere in the codebase, `Grep` for `declare module 'express` first and merge into the existing augmentation file instead of creating a second one).
- [ ] Run `npm test --prefix server` — all pass, no `console.*` remains (`Grep -r "console\." server/src` returns nothing outside of the new `logger.ts`'s own pino config, which doesn't call `console` at all).
- [ ] Commit: `feat: structured logging with pino + per-request correlation id`

---

## Task 12: Error tracking (Sentry) — server + client

**Files:**
- Modify: `server/src/config/env.ts` (add `SENTRY_DSN`)
- Create: `server/src/config/sentry.ts`
- Modify: `server/src/index.ts` (init Sentry before `bootstrap()`)
- Modify: `server/src/middleware/error.ts` (capture the unhandled-error branch)
- Create: `client/src/config/sentry.ts`
- Modify: `client/src/main.tsx` (init Sentry, wrap `<App/>` in `Sentry.ErrorBoundary`)
- Modify: `.env.example`, `server/.env.example`, `client/.env.example` (document the new optional vars)

**Interfaces:**
- Server: `initSentry(): void` — no-op if `env.SENTRY_DSN` is unset (graceful degradation, same as Redis).
- Client: `initSentry(): void` — no-op if `import.meta.env.VITE_SENTRY_DSN` is unset.

- [ ] Add dependency: `npm install @sentry/node --prefix server`.
- [ ] Add `SENTRY_DSN: z.string().optional()` to `envSchema` in `server/src/config/env.ts`.
- [ ] Create `server/src/config/sentry.ts`:
```ts
import * as Sentry from '@sentry/node';
import { env } from './env';

export function initSentry() {
  if (!env.SENTRY_DSN) return;
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV });
}

export { Sentry };
```
- [ ] In `index.ts`, call `initSentry()` as the first line of the module (before importing/using `app`, so Sentry can instrument as early as possible) — add `import { initSentry } from './config/sentry'; initSentry();` above the existing `import { app } from './app';` line.
- [ ] In `middleware/error.ts`, import `{ Sentry }` from `../config/sentry` and add `Sentry.captureException(err);` immediately before the final `req.log.error({ err }, 'Unhandled error');` line (the generic-500 branch only — not the `ZodError`/`HttpError`/`Prisma` branches above it, which `return` early and never reach this line).
- [ ] Add dependency: `npm install @sentry/react --prefix client`.
- [ ] Create `client/src/config/sentry.ts`:
```tsx
import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({ dsn, environment: import.meta.env.MODE });
}

export { Sentry };
```
- [ ] In `client/src/main.tsx`, call `initSentry()` before rendering, and wrap `<App />` in `Sentry.ErrorBoundary`:
```tsx
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { initSentry, Sentry } from './config/sentry';

initSentry();

const container = document.getElementById('root')!;
const app = (
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Algo deu errado. Recarregue a página.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);

// ...rest of the file (the /admin CSR-vs-hydrate branch) unchanged.
```
- [ ] Add `SENTRY_DSN` (commented, optional) to `.env.example` and `server/.env.example`; add `VITE_SENTRY_DSN` (commented, optional) to `client/.env.example`, each with a one-line comment noting it's optional and the app runs identically without it.
- [ ] Run `npx tsc --noEmit --prefix server` and `npx tsc -b` in `client/` — both pass (Sentry's types must resolve cleanly; `import.meta.env.VITE_SENTRY_DSN` needs `vite/client` types, already in `client/tsconfig.app.json`'s `types` array).
- [ ] Run `npm test --prefix server && npm test --prefix client` — all pass (Sentry is a no-op with no DSN set, which is the case in both test environments and CI, so no test needs to mock it — confirm no test unexpectedly starts network activity; if `@sentry/node`'s `init()` were ever called in tests it would need `SENTRY_DSN` to be set, which it isn't).
- [ ] Manually verify graceful degradation: run the app locally with `SENTRY_DSN`/`VITE_SENTRY_DSN` unset (the default) — confirm no errors, no changed behavior.
- [ ] Commit: `feat: add Sentry error tracking (server + client, opt-in via DSN)`

---

## Self-Review Notes

- **Ordering matters**: Task 11 (logging) must land before Task 10 turns on `no-console` for `server/` — the plan sequences them 10-after-11 in file lists but **execute Task 11 before Task 10** so the new lint rule has nothing left to flag. (Numbering here follows the audit's own order; execution order is 1-9, then 11, then 10, then 12.)
- **Task 9 is a checkpoint**, not new work — it depends on the parallel mechanical-fixes pass (no-explicit-any, no-unused-vars, no-unused-expressions, prefer-const, ban-ts-comment, react-refresh/only-export-components, and the `DynamicPage.tsx` conditional-hook bug) being complete first.
- **Spec coverage**: all four original quick wins (Tasks 1, 10, 11, 12) and the full 105-error lint remediation (Tasks 2-9, mechanical pass) are covered. No spec requirement lacks a task.
