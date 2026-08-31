# Audit Quick Wins — Spec

Source: "CMS Template Audit" artifact (published 2026-08-25), roadmap lane "Quick wins".

## Scope

Four items from the audit's "Quick wins" lane (days-scale effort):

1. **CI: tests + typecheck + lint no PR** — today only Lighthouse CI runs on PRs. Add `npm test`, `tsc --noEmit`/`tsc -b`, and `eslint` as required gates.
2. **Error tracking (Sentry)** — client and server exception capture. Today a 500 in production generates no alert.
3. **Structured logging (pino)** — replace remaining `console.*` in `server/src` with JSON logs carrying level + request-id.
4. **`/api/health` mais completo** — today only returns `{status:'ok'}`. Add DB and Redis status for a real liveness/readiness probe.

## Scope expansion (user-approved, 2026-08-25)

Baseline check before wiring lint into CI found `npm run lint --prefix client` fails with 105 pre-existing errors (server has no ESLint config at all). Making lint a blocking CI gate on top of that would break every PR immediately. The user asked to fix all 105 as part of this work, including the ~25 that come from `react-hooks/set-state-in-effect` / `react-hooks/refs` (stricter rules newly enforced by `eslint-plugin-react-hooks` v7's recommended config, flagging patterns already live in production — modal mount guards, query-synced draft state, an undo/redo store backed by refs). Those 25 require real behavior-preserving refactors, not just type annotations, so they're treated as first-class work here, not a lint-cleanup footnote. One of the 105 (`DynamicPage.tsx`, conditional `useQuery` call) is an actual bug, not a style nit.

## Acceptance criteria

- `npm run lint --prefix client` exits 0 with zero errors (warnings — `exhaustive-deps` etc. — are out of scope and remain).
- `npm run typecheck` (new script, root + client + server) exits 0.
- `npm test` (root) continues to pass (25 server + 77 client tests), with new tests added for the health endpoint and the request-id/logger plumbing.
- No behavior regression in any refactored component (modals, forms, undo/redo, blog/nav admin pages, article/blog pagination). Verified by existing test suite + manual smoke where no test covers the path.
- No `// eslint-disable` used to silence a rule except where a finding is a genuine false positive against a third-party library's documented API (dnd-kit's `useSortable()` — see plan Task 8); every such exception carries a comment explaining why.
- `.github/workflows/ci.yml` runs test + typecheck + lint on every PR touching `client/**`, `server/**`, or root config, required to pass before merge (matches the existing `lighthouse-ci.yml` trigger shape).
- `/api/health` returns `{ status, db, redis }` and keeps responding 200 for the existing-healthy case (Lighthouse CI's `wait-on` step depends on this).
- `SENTRY_DSN` (server) / `VITE_SENTRY_DSN` (client) are optional — app runs identically with them unset (graceful degradation, matching the existing Redis/storage pattern in this codebase).
- Only unhandled (500-path) server errors are sent to Sentry — not Zod validation errors or known `HttpError`s.
- All remaining server `console.*` calls (13 call sites) replaced with a shared pino logger; log lines include a request-id for anything logged during a request.

## Non-goals

- Fixing `react-hooks/exhaustive-deps` warnings (16 of them) — not required for the lint gate to pass, left as-is.
- Any of the "Consolidação" or "Investimento maior" roadmap lanes from the audit.
