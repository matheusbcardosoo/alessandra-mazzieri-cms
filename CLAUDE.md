# CLAUDE.md — web-cms-template

Template Node.js de site institucional com CMS próprio baseado em blocos.

## Stack

- **Frontend:** React 19 + Vite + TypeScript strict + React Query + Axios + Tiptap (editor de texto rico)
- **Backend:** Express 5 + TypeScript + Prisma + PostgreSQL
- **Storage:** Supabase (imagens/mídia)
- **Cache:** Redis (opcional, configurável via `REDIS_URL`) para cache permanente de configurações públicas
  - Endpoint `/api/public/theme` retorna toda `SiteSettings` cacheada em Redis → ~10-100x mais rápido
  - Inclui: tema, branding, sociais, WhatsApp, horários, etc
  - Cache vive para sempre, só morre ao atualizar configurações no admin
  - Graceful degradation: funciona sem Redis (busca do banco automaticamente)
  - Cache único e genérico (`CacheProvider` + `cacheKeys`/`cacheTTL` em `server/src/config/cache.ts`) para toda entidade pública (page, post, nav, home, site settings/tema) — não existe mais cache paralelo por feature. Todo endpoint admin de escrita invalida e, quando o resultado é público, já regenera a chave na mesma request (ver `docs/plano-template.md`, Fase 3)
- **Auth:** JWT em cookie `httpOnly` (`user_session`, setado pelo servidor). O client mantém só uma flag não-sensível em `localStorage` (`admin_authed`) para decidir a UI de rota — a segurança real é sempre o cookie, validado a cada request

## Como rodar

```bash
# 1. Copiar variáveis de ambiente
cp .env.example .env
cp client/.env.example client/.env.local

# 2. Instalar dependências (o hook postinstall já instala server/ e client/
# automaticamente e gera o Prisma Client — não precisa rodar npm install
# dentro de cada pasta)
npm install

# 3. Banco de dados
npx prisma migrate dev

# 4. (Opcional) Redis para cache de tema
# `npm run dev` / `npm start` (raiz) já sobem o Redis via docker-compose.yml
# automaticamente (hooks predev/prestart). Se o Docker não estiver rodando,
# o hook não trava o comando — só segue sem Redis. Manual: npm run docker:up

# 5. Rodar em desenvolvimento (servidor + cliente juntos, um único comando)
npm run dev
```

`postinstall.js` (raiz) pula a instalação automática de `server/`/`client/` quando `CI` ou `NODE_ENV=production` estão setados, porque CI (`ci.yml`, `lighthouse-ci.yml`) e o script `build` já rodam `npm ci --prefix server`/`--prefix client` explicitamente — instalar de novo ali seria redundante.

O cliente roda em http://localhost:5173 e faz proxy de `/api` para o servidor em `localhost:4000`.

### Redis (Opcional mas Recomendado)

Se Redis está configurado (via `REDIS_URL`):
- **Configuração do Site:** Cachada permanentemente em Redis (sem TTL). Cache só morre ao atualizar no admin.
- **O que é cacheado:** Tema, branding, sociais, WhatsApp, horários, logo, etc (tudo de `SiteSettings`)
- **Benefício:** Primeira carga do site **10-100x mais rápida** (elimina database query)
- **Fallback:** Se Redis cair, app continua funcionando (busca do banco automaticamente)
- **Sem Redis:** App funciona normalmente, mas faz query ao banco a cada load

Para development local, o Redis já sobe via `docker-compose.yml` (raiz), acionado automaticamente por `npm run dev`/`npm start` (hooks `predev`/`prestart`) ou manualmente com `npm run docker:up` / `npm run docker:down`. Portas e senha são configuráveis via `REDIS_PORT`/`REDIS_PASSWORD` no `.env`.

## Estrutura do projeto

```
/
├── client/          Frontend React (Vite)
│   └── src/
│       ├── api/         Axios instance + funções de query
│       ├── assets/      Assets estáticos (SVGs, imagens)
│       ├── blocks/      Registry de blocos + renderer/Form/schema por tipo
│       ├── components/  Componentes React reutilizáveis
│       │   └── RichTextEditor/  Editor de texto rico (toolbar + sub-modais + hooks)
│       ├── hooks/
│       │   └── queries/ Custom hooks de React Query (usePages, useArticles, useMedia, ...)
│       ├── pages/       Páginas (públicas e admin)
│       ├── types/       Tipos TypeScript por domínio
│       │   ├── blocks.ts    Tipos dos 16 blocos (PageBlock union)
│       │   ├── layout.ts    PageLayoutV2, PageSection, Page
│       │   ├── content.ts   Article, SiteSettings, FormSubmission
│       │   ├── auth.ts      User, Media, NavbarItem, SocialLink
│       │   └── index.ts     Re-exporta tudo
│       └── utils/       Funções utilitárias puras
├── server/          Backend Express (TypeScript)
│   └── src/
│       ├── routes/      Rotas da API
│       ├── middleware/  Auth, rate limit, upload
│       └── services/    Lógica de negócio
├── prisma/          Schema do banco e migrações
└── docs/            Documentação e planos de execução
    └── superpowers/
        ├── specs/   Documentos de design/auditoria
        └── plans/   Planos de implementação passo a passo
```

## Sistema de blocos

Páginas são compostas por **seções** → **colunas** → **blocos**. O JSON é salvo no campo `layout` da tabela `Page` (PostgreSQL).

Os 16 tipos de bloco estão definidos em `client/src/types/blocks.ts` como discriminated union (`PageBlock`). O banco salva o JSON bruto — o frontend renderiza usando `PageRenderer.tsx`.

**Tipos de bloco disponíveis:**
`text`, `image`, `button`, `buttonGroup`, `cards`, `cta`, `form`, `hero`, `media-text`, `pills`, `recent-posts`, `services`, `social-links`, `span`, `whatsapp-cta`, `contact-info`

**Adicionar um novo bloco:**
1. Criar pasta `client/src/blocks/<nome>/` com `renderer.tsx`, `Form.tsx`, `schema.ts`
2. Adicionar 1 linha no `client/src/blocks/registry.ts`
3. Adicionar o novo tipo ao union `PageBlock` em `client/src/types/blocks.ts`
4. Adicionar preset em `sectionPresets.ts` se quiser que apareça na galeria

## Páginas reservadas (home, blog)

`home` e `blog` (`RESERVED_PAGE_KEYS` em `server/src/utils/reservedPages.ts`) são `Page`s com `pageKey`/`slug` fixo que os endpoints genéricos de `/api/admin/pages` recusam criar, renomear, despublicar ou remover — sempre existem, sempre publicadas. Ao adaptar um projeto simples pra este template (ver seção do README pra IA assistente), não crie uma `Page` normal com slug `home` ou `blog`.

- **`home`**: `HomeService` garante a existência e usa o `layout` normal de seções/colunas/blocos, igual qualquer outra página — só é reservada quanto a criar/renomear/remover.
- **`blog`**: `BlogService` (`server/src/services/blog.service.ts`) também garante a existência (`ensureBlog()`), mas o `layout` **não** é o sistema de blocos — é uma config pequena e fixa (`title`, `description`, `sections[]`) que controla quais das 3 seções da página `/blog` aparecem e em que ordem: `featured`, `mostViewed`, `allArticles` (tipos em `server/src/utils/blogLayout.ts`, cada entrada validada e normalizada individualmente — uma seção inválida não derruba as demais). O conteúdo de fato (os posts) vem de `PostService`, não da `Page`.
  - Admin edita via `GET /api/admin/blog` / `PUT /api/admin/blog/:id` (`blog.controller.ts`), UI em `AdminBlogPage.tsx`, hooks `useAdminBlog`/`useUpdateBlog` (`client/src/hooks/queries/useBlog.ts`).
  - Público lê via `getBlogHome` (mescla essa config com os posts reais), cacheado em `cacheKeys.blog` — separado do cache de posts (`cacheKeys.blogHome`).

## Importações

Use o alias `@/` para imports dentro de `client/src/`:
```typescript
import { Modal } from '@/components/AdminUI';
import type { PageBlock } from '@/types';
import type { TextBlockData } from '@/types/blocks';
```

## API

- Rotas públicas: `/api/public/...` — sem autenticação
- Rotas admin: `/api/admin/...` — requerem o cookie `httpOnly` `user_session` (setado por `POST /api/login`, limpo por `POST /api/logout`)
- Upload de mídia: `/api/media/upload` — multipart/form-data
- Submissão de formulários: `/api/forms/submit`
- `CLIENT_URL` (env do servidor) precisa apontar para a origem do client (CORS + cookie)

## Convenções

- TypeScript strict — sem `any` sem motivo explícito e comentário justificando
- Componentes em PascalCase, hooks com prefixo `use`
- Funções utilitárias puras em `utils/` (sem efeitos colaterais)
- Sem `console.log` em código de produção
- Sem `window.confirm` ou `window.prompt` — usar `Modal` e `ConfirmModal` de `components/AdminUI.tsx`
- Placeholders de imagem: usar `@/assets/image-placeholder.svg`, nunca URLs externas

## Plano de evolução do template

Ver `docs/plano-template.md` para o plano completo de transformação deste projeto em repositório template GitHub (SSR, cache/invalidação, SEO/AI-readiness, generalização de funções, empacotamento).
