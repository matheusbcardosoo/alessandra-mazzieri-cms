# Editor da página de Blog — Design

**Data:** 2026-08-23
**Status:** Aprovado para planejamento

## Contexto

A página `/blog` (`client/src/pages/BlogPage.tsx`) hoje é inteiramente hardcoded em
React: título, descrição, busca e as três listagens de artigos (Em destaque, Mais
vistos, Todos os artigos) têm posição e presença fixas no código. O restante do
site (Home, páginas custom) já é editável via um sistema de blocos/seções
(`PageLayoutV2` + `PageRenderer` + `AdminPageEditorPage`).

Objetivo: tornar o blog editável pelo admin — reordenar, mostrar/ocultar,
adicionar e remover suas seções, e editar os textos do cabeçalho — **sem**
abrir a página para blocos genéricos (texto, imagem, CTA) como a Home permite.
Esse escopo restrito foi uma decisão explícita do usuário: o blog deve continuar
sendo composto apenas pelos seus próprios tipos de seção (listagens de artigos),
não um canvas livre de blocos.

## Decisões de escopo (confirmadas com o usuário)

1. **Editor restrito**, não o page-builder genérico. Não reutiliza
   `AdminPageEditorPage`/`PageRenderer`/blocos.
2. **3 tipos de seção fixos e pré-definidos**: `featured` (Em destaque),
   `mostViewed` (Mais vistos), `allArticles` (Todos os artigos, com busca +
   paginação). Cada tipo aparece no máximo 1 vez. "Adicionar seção" = escolher
   um tipo ainda ausente. Título/subtítulo de cada seção são editáveis; a fonte
   de dados (quais artigos aparecem) não muda.
3. **Cabeçalho fixo no topo** (título + descrição + busca) — não entra na
   lista reordenável de seções. Só o texto é editável.
4. **Comportamento de busca**: a caixa de busca do cabeçalho fica sempre
   visível, independente da seção `allArticles` estar presente/visível na
   config. Ao buscar (termo não vazio), a página força a exibição de uma
   listagem "Todos os artigos" filtrada (com paginação), usando o
   título/subtítulo da seção `allArticles` se ela existir na config (mesmo
   oculta), senão um texto default — e esconde todas as outras seções
   enquanto a busca estiver ativa. Isso replica o comportamento atual da
   página (que já esconde Destaques/Mais vistos durante a busca), agora
   resiliente ao caso da seção ter sido removida da config.

## Modelo de dados

Sem migração de schema: reutiliza a tabela `Page`, reservando
`pageKey: 'blog'` — mesmo padrão já usado por `pageKey: 'home'`.

- `Page.title` / `Page.description` → título e descrição do cabeçalho do blog.
- `Page.layout` → JSON próprio do blog (não é `PageLayoutV2`):

```json
{
  "version": 1,
  "sections": [
    { "type": "featured", "visible": true, "title": "Em destaque", "subtitle": "Selecionados para aparecer primeiro no blog." },
    { "type": "mostViewed", "visible": true, "title": "Mais vistos", "subtitle": "O que as leitoras estão consumindo agora." },
    { "type": "allArticles", "visible": true, "title": "Todos os artigos", "subtitle": "Artigos mais recentes, incluindo destaques e mais vistos." }
  ]
}
```

Regras de validação: `type` ∈ {`featured`, `mostViewed`, `allArticles`}, sem
duplicatas; a ordem do array define a ordem de exibição; um tipo ausente do
array = seção nunca adicionada (distinto de `visible: false`, que é "oculta
mas configurada" — relevante para o fallback de título durante busca).

Ao criar o registro pela primeira vez (`ensureBlog`, análogo a `ensureHome`),
os 3 tipos são inicializados com os textos atuais da página (os mesmos que já
estão hardcoded hoje), todos `visible: true`, nessa ordem — a página pública
fica idêntica à atual até alguém editar no admin.

## Servidor

- `server/src/utils/blogLayout.ts` — normaliza/valida o JSON acima (tipos
  únicos, dentro do conjunto permitido, preenche defaults ausentes). Espelha
  `server/src/utils/pageLayout.ts`.
- `server/src/services/blog.service.ts` — espelha `HomeService`:
  `ensureBlog()`, `getAdmin()`, `getPublic()` (cacheado), `updateBlog(id, {title, description, layout})`.
  Cache permanente (sem TTL), invalidado e regenerado a cada update do admin —
  mesmo padrão da home (`syncCache`).
- `server/src/config/cache.ts` — nova chave/TTL para a config do blog (cache
  permanente, distinto do `cacheKeys.blogHome` existente que já cacheia
  featured/mostViewed com TTL de 120s e não muda).
- `GET /api/public/blog-home` (endpoint já existente, usado por
  `fetchBlogHome`) passa a incluir `title`, `description`, `sections` na
  resposta, além dos campos atuais (`featured`, `mostViewed`) — evita um
  segundo round-trip no client. A composição acontece no controller/serviço
  chamando `blogService.getPublic()` e `postService.getBlogHome()` em
  paralelo; os dois caches continuam independentes internamente.
- `GET /api/admin/blog` / `PUT /api/admin/blog` — mirror de
  `server/src/modules/admin/home.controller.ts`. Sem fluxo de
  rascunho/publicação separado: salvar já publica, igual à Home.
- `pages.controller.ts` — os guards que hoje tratam `pageKey === 'home' ||
  slug === 'home'` (update/get/publish/unpublish/delete) passam a tratar
  `'blog'` da mesma forma, para que a página reservada do blog não apareça
  nem seja editável pelo CRUD genérico de páginas.
- `page.repository.ts` — `findAllPublished()` (usado no sitemap) e o
  `excludePageKey` de `listAdmin()` passam a excluir também `'blog'` (hoje só
  excluem `'home'`); generalizar para aceitar mais de uma chave.

## Admin UI

Novo `client/src/pages/AdminBlogPage.tsx`, rota `/admin/blog`, item no menu
lateral (`AdminLayout.tsx`, reaproveitando o ícone `faNewspaper` já
importado). Editor dedicado — não usa `AdminPageEditorPage`:

- Campos de texto para título e descrição do cabeçalho.
- Lista ordenável das seções presentes na config (drag-and-drop reaproveitando
  `@dnd-kit`, já usado em `SortableSection`), cada item com:
  - título/subtítulo editáveis inline,
  - alternância visível/oculto (ícone de olho, como já existe em
    `SectionEditor`),
  - remover.
- Botão "+ Adicionar seção" abre uma lista simples com os tipos ainda não
  presentes (no máximo 3 no total); ao escolher, a seção é adicionada ao fim
  com título/subtítulo default.
- Botão salvar → `PUT /api/admin/blog`, com toast de sucesso/erro (reusando
  `components/Toast`).

## Página pública (`BlogPage.tsx`)

- Busca `fetchBlogHome` estendido (título, descrição, sections, featured,
  mostViewed) + mantém a busca separada de `fetchArticles` para a listagem
  "Todos os artigos" (paginada/filtrada), como já é hoje.
- Cabeçalho sempre renderizado primeiro, usando os textos vindos da config
  (fallback para os textos atuais enquanto carrega/se a config não existir
  ainda).
- **Sem busca ativa**: renderiza as seções presentes na config, na ordem e
  visibilidade configuradas, reaproveitando os componentes atuais
  (`ArticleCard` grid para `featured`/`mostViewed`, `ArticleListItem` + lista
  paginada para `allArticles`). Badges cruzados (artigo aparece em Destaque
  e/ou Mais visto) continuam calculados como hoje, apenas quando as
  respectivas seções existem na config.
- **Com busca ativa**: esconde todas as seções normais e renderiza só a
  listagem filtrada de "Todos os artigos", usando o título/subtítulo da seção
  `allArticles` na config (se existir, mesmo oculta) ou o texto default.

## Testes

- Servidor: testes unitários para `blogLayout.ts` (normalização, unicidade de
  tipos, defaults) e para `blog.service.ts` (ensure/update/invalidação de
  cache), espelhando os testes existentes de `home.service`/`pageLayout` se
  houver.
- Client: teste de componente para `AdminBlogPage` (adicionar/remover/
  reordenar/ocultar/salvar) e para `BlogPage` cobrindo ordem/visibilidade das
  seções e a interação com busca (seção forçada a aparecer mesmo removida da
  config).
- Manual: `npm run dev`, confirmar que a página pública fica idêntica à atual
  antes de qualquer edição; depois, no admin, reordenar/ocultar/remover+
  readicionar/editar textos e confirmar reflexo na página pública, incluindo
  o caso de busca com a seção "Todos os artigos" removida.
