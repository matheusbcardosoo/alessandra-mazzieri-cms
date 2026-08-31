# Granular Roles & Page/Section Permissions — Design

## Overview

Today `User.role` is a free-text field that is always `"admin"` — every authenticated
user has unrestricted access to every admin route (`server/src/modules/admin/admin.routes.ts`
mounts a single flat router behind one `requireAuth`). This design introduces two more
roles — `owner` (the paying client) and `editor` (staff the owner brings on) — with
per-page access control for the Páginas section and per-section on/off toggles for
everything else, so an agency (admin) can hand a site to a client without handing over
everything, and a client can safely delegate parts of the site to their own staff.

## Goals

- Three roles: `admin` (the template's operator — always full access, never restricted
  by anyone, never creatable through the app), `owner` (one per site — the client),
  `editor` (zero or more per site — the owner's staff).
- `admin` and `owner` can manage `owner`/`editor` accounts respectively, via a dedicated
  "Gerenciamento de usuários" screen — the *only* way accounts are created.
- Fine-grained, per-page access control for the Páginas section (includes the reserved
  `home` page).
- Coarse, per-section on/off access for: Blog (config + Artigos), Menu (navegação),
  Mídia, Formulários (respostas), Configurações do Site.
- An owner can never delegate to an editor more than the owner itself currently has
  (sections or pages).
- Revoking access takes effect on the affected user's very next request — no stale
  JWT claims, no waiting for re-login.

## Non-Goals

- **Audit log** (who did what, when) — related but independent; separate spec.
- Per-action granularity within a page (view vs. edit vs. publish) — a single
  "has access to this page" flag covers the whole page-editor flow.
- Per-post (Artigo) granularity — Artigos is covered by the blanket `blog` section
  toggle, not individual post ACLs.
- Changing a user's `role` after creation (owner → editor or vice versa) — delete and
  recreate the account instead.
- Real-time revocation UX (e.g., kicking an open browser tab mid-edit) — the next
  request after revocation gets a `403`; no websocket push.
- Multiple owners per site (exactly one, enforced at creation).
- **Continuous delegation invariant.** The delegation rule (owner can't grant more than
  it has) is checked only at write-time — when an owner's own access is *later*
  narrowed by admin, any editor permissions the owner previously granted that now
  exceed the owner's shrunk access are **not** automatically revoked; they sit as a
  stale grant until someone edits that editor again. Recomputing/cascading on every
  admin edit would add real complexity for a scenario that's rare in practice (admin
  restricting an owner after the fact); flagging it here as a deliberate cut, not an
  oversight.

## Data Model

```prisma
enum UserRole {
  admin
  owner
  editor
}

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  password      String
  name          String
  role          UserRole @default(admin) // default exists only for the pre-existing
                                          // seeded row during migration; every
                                          // application-level create always passes
                                          // role explicitly (Zod-required)
  sectionAccess Json     @default("{}")  // { blog, menu, media, forms, settings: boolean }
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  pageAccess    UserPageAccess[]
}

model UserPageAccess {
  id        String   @id @default(uuid())
  userId    String
  pageId    String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  page Page @relation(fields: [pageId], references: [id], onDelete: Cascade)

  @@unique([userId, pageId])
}
```

`Page` gains the inverse relation `pageAccess UserPageAccess[]`.

Section keys (fixed set of 5, validated by a Zod enum, not a DB enum — `sectionAccess`
stays a `Json` column since the set is small and only ever read/written as a whole
object, never queried relationally):

| key        | covers                                              |
|------------|------------------------------------------------------|
| `blog`     | `/admin/blog` (config) + `/admin/articles` (Artigos CRUD) |
| `menu`     | `/admin/navbar` (navigation-items)                   |
| `media`    | `/admin/media`                                        |
| `forms`    | `/admin/form-submissions`                             |
| `settings` | `/admin/settings` (site settings)                     |

Not gated by any toggle — always visible to any authenticated role:
Dashboard (`/admin/metrics`), Ajuda (`/admin/ajuda`).

Gated by **role only** (not `sectionAccess`): Gerenciamento de usuários
(`admin`/`owner` only — never delegable to `editor`).

Gated by **`UserPageAccess`**, not a section toggle: Páginas (`/admin/pages/*`),
including the reserved `home` page (`/admin/home`, resolved via `pageKey: 'home'`).

## Authorization Layer

- `requireAuth` (`server/src/middleware/auth.ts`) is extended: after verifying the JWT,
  it fetches the current `User` row fresh from the DB (`role`, `sectionAccess`) instead
  of trusting the JWT payload for anything but `id`. If the user no longer exists
  (deleted mid-session), respond `401`. One extra PK lookup per authenticated request —
  acceptable at this scale, and it's what makes revocation apply immediately.
- `requireRole(...roles: UserRole[])` — new middleware; used on `/admin/users/*` and on
  `POST /admin/pages`.
- `requireSection(key: SectionKey)` — new middleware; `role === 'admin'` always passes;
  otherwise reads `req.user.sectionAccess[key] === true`.
- `requirePageAccess(resolvePageId: (req) => Promise<string>)` — new middleware;
  `role === 'admin'` always passes; otherwise looks up `UserPageAccess` for
  `(req.user.id, await resolvePageId(req))`. No access → `403` (pages the user can't
  see are already excluded from their list, so hitting the id directly is the only way
  to trigger this).
- `admin.routes.ts` is reorganized into per-section blocks, each preceded by its
  `requireSection(...)` call, instead of one flat `adminRoutes.use(requireAuth)` covering
  everything indiscriminately.
- `GET /admin/pages` filters server-side by `UserPageAccess` for `owner`/`editor`
  (admin: unfiltered).
- `POST /admin/pages` requires `requireRole('admin', 'owner')` (editors don't create
  pages from scratch) and, on success, creates a `UserPageAccess` row for the creator.
- **Delegation rule**: when an `owner` creates/edits an `editor`, the write is rejected
  (`400`) if it grants any section or page the owner itself doesn't currently have.
  `admin` is exempt (always has everything).
- No endpoint ever accepts `role: 'admin'` — the only admin account is the one from
  `server/src/prisma/seed.ts`.
- No user can edit their own row via `/admin/users` (only a strictly-higher role edits
  a lower one).

## API

New module `server/src/modules/admin/users.controller.ts` +
`users.routes.ts`, mounted under `requireAuth, requireRole('admin', 'owner')`:

- `GET /admin/users` — admin: returns owner + all editors. owner: returns only editors
  (never admin, never itself).
- `POST /admin/users` — body `{ email, password, name, role: 'owner'|'editor',
  sectionAccess: Record<SectionKey, boolean>, pageAccess: string[] }`, all fields
  required (Zod). Creating a second `owner` when one already exists → `409`. `owner`
  creating anything but `role: 'editor'` → `400`.
- `PATCH /admin/users/:id` — edits `name`/`password`/`sectionAccess`/`pageAccess`.
  A `role` field in the body that differs from the stored role → `400` ("role não pode
  ser alterado depois de criado — crie uma nova conta").
- `DELETE /admin/users/:id` — cascades to `UserPageAccess` via the FK. Deleting the only
  `owner` is allowed (site is ownerless until admin creates a new one).

All writes apply the delegation rule and the no-self-edit rule from the authorization
layer above.

## Client

- `GET /api/admin/me` response gains `role`, `sectionAccess`, and `canAccessHome`
  (boolean — not the full `pageAccess` array, keeps the payload small; it's the one
  page-level fact the sidebar needs).
- `AdminLayout.tsx`: each sidebar item checks the matching section before rendering —
  `Barra de navegação` → `menu`, `Blog` + `Artigos` → `blog`, `Configurações do Site` →
  `settings`, `Respostas dos formulários` → `forms`, `Imagens` → `media`. `Página
  inicial` uses `canAccessHome`. `Dashboard`, `Páginas`, and `Ajuda` always render.
  A new **"Usuários"** item renders only for `admin`/`owner`.
- New `AdminUsersPage.tsx` (`/admin/usuarios`): list + create/edit form. The page
  picker reuses the existing `/admin/pages` list but unfiltered by the *target's*
  access — it shows what the *manager* (the logged-in admin/owner) can grant, per the
  delegation rule enforced server-side. Section access is 5 checkboxes.

## Testing

Server (`vitest`):
- `requireAuth`: deleted user mid-session with a still-valid JWT → `401`.
- `requireSection`: admin bypass; owner/editor allow/deny per `sectionAccess`.
- `requirePageAccess`: admin bypass; owner/editor allow/deny per `UserPageAccess`;
  home-page resolution.
- Delegation rule: owner granting an editor a section/page the owner lacks → `400`.
- Role immutability: `PATCH .../:id` with a different `role` → `400`.
- Single-owner enforcement: creating a second owner → `409`.
- Self-edit block: owner editing its own row, editor editing its own row → `403`.
- Cascade delete: deleting a `User` removes its `UserPageAccess` rows; deleting a
  `Page` removes any `UserPageAccess` rows pointing at it.
- `GET /admin/pages` returns the full list for admin, a filtered list for owner/editor.

Client (`vitest` + Testing Library):
- `AdminUsersPage`: creation form rejects submit without role/sections/pages picked.
- `AdminLayout`: sidebar items render/hide per `role`/`sectionAccess`/`canAccessHome`
  fixture combinations.
- Existing 77 client + 25 server tests continue passing unmodified in behavior (no
  regression for the existing single-admin flow).

## Error Handling / Edge Cases

| Scenario | Behavior |
|---|---|
| JWT valid but user row deleted | `401`, forces re-login |
| Owner tries to reach/modify the admin account via `/admin/users/:id` | `403` (admin is filtered out of the owner's list server-side; direct id also rejected) |
| `PATCH` includes a changed `role` | `400`, explicit message, no silent drop |
| Owner grants editor access owner doesn't have | `400` |
| Editor calls `POST /admin/pages` | `403` |
| Admin deletes the only owner | Allowed — site has no owner until one is created again. Editors created by that owner are **not** cascade-deleted (there's no `ownerId` link — with a single owner per site there's nothing to scope by); they remain, manageable by admin until a new owner exists |
| Editor's tab open when access is revoked | No push; next request (e.g., save) gets `403` |

## Migration Notes

- Existing databases have exactly one `User` row with the free-text `role: "admin"`.
  The Prisma migration converts the column to `UserRole` — the existing value maps
  cleanly since `"admin"` is already a valid enum member. `sectionAccess` backfills to
  `{}` via the column default; irrelevant for that row since `admin` always bypasses it.
- `server/src/prisma/seed.ts` is unchanged — it still only creates the single `admin`
  user. Owner/editor accounts are created afterward through the new
  "Gerenciamento de usuários" screen, not through the seed script.
