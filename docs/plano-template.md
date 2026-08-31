# Plano — crisjageneski.com.br → repositório template

## Diagnóstico (2026-08-09)

- Site é 100% CSR (Vite + React puro, sem SSR): `client/index.html` sobe um `<div id="root">` vazio, título genérico "client", zero meta description/H1 no HTML inicial. Isso explica a tela branca de ~5s e a nota baixa no PageSpeed/Seobility (39% on-page).
- `SiteSettings` já tem `metaDescription`, `ogImageUrl`, `gaId`, `gscVerification` no schema — só não são injetados no HTML.
- Não existe `robots.txt` nem `sitemap.xml` em lugar nenhum do projeto.
- Já existe um padrão de cache Redis "permanente até o admin salvar" (`themeCache.service.ts`) — é a base natural pra resolver a invalidação de cache (Importante 2).

## Fases

**Fase 1 — Bootstrap do template**
Copiar a base de `crisjageneski.com.br` para `D:\Projetos\template` (novo git history). Extrair conteúdo/branding específico da Cris (textos, cores fixas, CNPJ/CRP) para fixtures/seed genéricos. Definir o "contrato de conteúdo" — os campos que um projeto simples (html/css/js) precisa expor para uma IA conseguir migrar o conteúdo para o template automaticamente.

**Fase 2 — SSR customizado no Express** ✅ concluída (2026-08-09)
`renderToString` no Express reaproveitando os componentes de blocks/PageRenderer existentes (mesmo código client+server, via `entry-server.tsx`). Hidratação com `hydrateRoot` (React 19) + `HydrationBoundary` do React Query (estado embutido no HTML, sem refetch duplicado). Build SSR via Vite (`vite build --ssr`, bundle autossuficiente com `ssr.noExternal` só em produção). Meta tags dinâmicas (title, description, canonical, OG, JSON-LD de Organization/Article) e H1 real (hero) injetados antes do render — resolve o CSR vazio que zerava o score do Seobility/isitagentready.

Decisões relevantes:
- `/admin/*` continua servido como shell CSR puro (sem SSR) — não é indexado e os componentes de edição (Tiptap, dnd-kit, react-image-crop) não são SSR-safe. Por isso o registry de blocos foi dividido em `blocks/registry.ts` (admin, com `Form`) e `blocks/rendererRegistry.ts` (público/SSR, só `renderer`).
- SSR busca dados chamando a própria API por HTTP interno (`INTERNAL_API_URL`, loopback na mesma porta em produção) reaproveitando as mesmas funções de `api/queries.ts` do client — não duplica lógica de fetch/serialização.
- `npm run dev` do client agora sobe `client/dev-server.js` (Vite em middleware mode + SSR) em vez do `vite` puro; a API em `server/` continua igual, na porta 4000.
- Pendências para as próximas fases: invalidação de cache do HTML renderizado (Fase 3), robots.txt/sitemap dinâmicos e redirect www/non-www (Fase 4), code-splitting do bundle client (>500kB) fica como melhoria futura de performance.

**Fase 3 — Cache e invalidação (Importante 2)** ✅ concluída (2026-08-09)
`themeCache.service` (cache Redis paralelo, chave própria, sem TTL) foi removido: `/api/public/theme` agora usa `SiteSettingsService.getPublic()`, o mesmo cache genérico (`CacheProvider` + `cacheKeys`/`cacheTTL` de `config/cache.ts`) já usado por page/post/nav/home. Um único cache por entidade, não dois mecanismos fazendo a mesma coisa.

Todo endpoint admin de escrita (page, post, nav, home, settings) agora **regenera** o cache relevante na mesma request em vez de só invalidar e esperar a próxima leitura pública pagar o custo da query:
- `PageService`/`PostService`: após create/update/publish, repopulam a chave da própria entidade com o dado já em mãos (`cacheProvider.set`) quando o resultado está publicado; quando o resultado vira/permanece rascunho (ou é removido), apenas invalidam (`cacheProvider.del`) — nunca cacheiam um rascunho como se fosse público.
- `PostService` também regenera as listas agregadas (destaques, mais vistos, home do blog) na mesma request. Listas paginadas (`postsList`) ficam só invalidadas — o espaço de combinações página/limite/busca é grande demais para regenerar todas.
- `HomeService`/`NavigationService`/`SiteSettingsService`: regeneram diretamente (a home é sempre publicada; nav e settings não têm conceito de rascunho).
- `PostService.incrementViews` (chamado a cada visualização pública, caminho de alta frequência) continua só invalidando — não regenera as listas a cada view.

Sitemap ainda não existe (chega na Fase 4); quando existir, entra no mesmo padrão de invalidação+regeneração aqui estabelecido.

**Fase 4 — SEO técnico e AI-readiness** ✅ concluída (2026-08-09)
`SeoService` (`server/src/services/seo.service.ts`) tem uma única função `collectPublicContent()` que agrega páginas publicadas + posts publicados + rotas estáticas (`/`, `/blog`) — sitemap.xml e llms.txt são só duas formatações diferentes do mesmo dado, em vez de cada endpoint consultar o banco à sua maneira.

- `GET /robots.txt`: `Allow: /`, `Disallow: /admin`, `Sitemap: <SITE_URL>/sitemap.xml` e um bloco `Content-Signal` (proposta Cloudflare) sinalizando a bots de IA que `search`/`ai-input` são permitidos e `ai-train` é controlado por `AI_TRAINING_ALLOWED` (default `no`, ou seja, indexação/uso por agentes liberado, treino de modelo não).
- `GET /sitemap.xml` e `GET /llms.txt`: cacheados no mesmo `CacheProvider` genérico (`cacheKeys.sitemap`/`cacheKeys.llmsTxt`, TTL igual ao de página). Todo write de `Page`/`Post` (create/update/publish/unpublish/delete) chama `SeoService.regeneratePublicIndexes()` na mesma request, seguindo o padrão de invalidação+regeneração já estabelecido na Fase 3.
- `SITE_URL` (nova env) é a origem canônica usada nesses três endpoints e no redirect 301 www↔non-www (`server/src/middleware/canonicalHost.ts`), montado como primeiro middleware tanto na API (`app.ts`) quanto no servidor de produção (`server.js`, via build compilado, para cobrir `/assets` também) — resolve o item do Seobility sobre domínio com/sem `www`.
- JSON-LD (Organization + Article) e meta description por página já tinham sido resolvidos na Fase 2 (`client/src/ssr/seo.ts`) — nada novo aqui.
- Em dev, `/robots.txt`, `/sitemap.xml` e `/llms.txt` foram adicionados ao proxy do Vite (`client/vite.config.ts`) — sem isso caíam no catch-all de SSR em vez de ir para a API.

**Fase 5 — Generalização de funções (Importante 3)** ✅ concluída (2026-08-09)
Auditoria não encontrou duplicação de lógica de negócio por entidade (não existem "curtir artigo"/"curtir foto" etc. hoje) — a duplicação real estava na camada de controllers: os ~40 handlers de `modules/admin/*` e `modules/public/*` repetiam o mesmo `try { ... } catch (error) { return next(error) }`. Como o projeto já roda Express 5 (`server/package.json`), que encaminha automaticamente rejeições de handlers async para o error middleware (confirmado em `node_modules/router/lib/layer.js`), esse boilerplate era redundante — `forms.controller.ts` e `formSubmissions.controller.ts` já provavam isso funcionando sem `try/catch`. Removido de todos os controllers (`admin/*`, `public/*`, `media`, `auth`), que agora seguem o mesmo padrão enxuto.

Outras consolidações no mesmo escopo:
- `z.object({ id: z.string() })` / `z.object({ id: z.string().uuid() })`, repetidos em ~15 handlers, viraram `idParamSchema`/`uuidParamSchema` em `server/src/utils/validation.ts`.
- `navigation.controller.ts`: a validação de `superRefine` (pageKey/url/parentId) estava duplicada entre `createSchema` e `updateSchema` — extraída para `validateNavRefs()`.
- `public/posts.controller.ts`: parsing de `excludeIds` (split/trim/filter) duplicado entre `listPosts` e `listMostViewedPosts` — extraído para `parseExcludeIds()`.
- Removidos logs de debug (`console.log`) deixados em `pages.controller.ts`, `navigation.controller.ts`, `forms.controller.ts`, `page.service.ts` e `home.service.ts` — violavam a convenção "sem console.log em produção" do CLAUDE.md.

Sem mudança de comportamento: `npx tsc --noEmit` não introduziu nenhum erro novo nos arquivos tocados (os erros pré-existentes são do Prisma Client não gerado neste sandbox, sem acesso de rede aos binários).

**Fase 6 — Empacotamento como template GitHub** ✅ concluída (2026-08-09)
README ganhou a seção "Para uma IA assistente: migrando um projeto simples para este template" (passo a passo apontando para `docs/contrato-de-conteudo.md`) e um checklist de primeiro uso do repositório gerado.

`.github/workflows/lighthouse-ci.yml` roda em todo PR: sobe Postgres efêmero, builda o app em modo produção (client + SSR + server compilado), popula com o seed genérico e audita `/`, `/sobre`, `/contato` e `/blog` via `lhci` (config em `lighthouserc.json`, thresholds `performance ≥ 0.6`, `accessibility/best-practices/seo ≥ 0.9`) — falha o PR em regressão.

"Marcar como Template repository" é um toggle de `Settings → General` no GitHub, sem equivalente via arquivo de config — documentado como passo manual no checklist do README. O remote (`origin` → `github.com/matheusbcardosoo/template`) já foi configurado depois da escrita original deste plano; falta confirmar que o toggle foi de fato marcado no GitHub.

**Fase 7 — Validação**
Rerodar isitagentready.com, Seobility e PageSpeed contra o site gerado a partir do template e comparar com o baseline (39% on-page / 0 itens agent-ready hoje). Checklist de aceite item a item da lista do Seobility.

**Fase 8 — Guia do cliente final (wiki com prints + passo a passo)** ✅ implementada (2026-08-28)
Manual de uso do admin voltado ao cliente não-dev que recebe o site pronto — não é documentação técnica. 43 tutoriais em 9 categorias que espelham a navegação do admin (Primeiros passos, Painel, Páginas, Blocos de conteúdo, Blog, Menu, Mídia, Formulários, Configurações do site), com busca e seção "Comece por aqui" com os 8 fluxos mais prováveis do dia a dia do cliente.

Decisões de escopo:
- **Onde a wiki final vive:** decidido — rota dentro do próprio admin (`/admin/ajuda`), porque assim o guia é gerado/versionado junto com cada site do cliente (sem hospedagem separada) e reaproveita o design system existente. Alternativas descartadas: site estático à parte (pipeline de build extra por projeto) e artefato hospedado no claude.ai (não fica sob controle do repositório do cliente).
- **Prints não são manuais nem genéricos.** Precisam refletir a instância real de cada cliente (cores do tema, logo, conteúdo migrado), não os dados de seed do template. Isso exige automação reproduzível, não capturas feitas uma vez à mão.
- **Manifesto de tutoriais:** cada tutorial do catálogo mapeia para uma rota admin + passos + texto, num manifesto versionado (ex.: `docs/guia-cliente/tutoriais.json`) — mesma estrutura de dados já prototipada no artefato do catálogo.
- **Motor de automação:** Playwright (headless) como devDependency, chamado por um script `npm run generate:help-screenshots` — precisa ser não-interativo porque qualquer IA de código (não só uma sessão interativa) tem que conseguir disparar a regeneração depois de migrar um projeto simples para o template.
- **Texto e print são gerados em momentos diferentes, por motivos diferentes.** O texto descreve a *mecânica do admin* (sempre igual, é o mesmo código de template em qualquer projeto gerado) — é escrito **uma única vez**, quando `/admin/ajuda` é implementada (passos 1–4 abaixo), e vira parte do manifesto versionado no repo. Nunca é regerado por uma migração. O print mostra o *conteúdo real* de cada cliente (páginas, logo, cores) — por isso só ele precisa do passo de regeneração (passo 5) toda vez que um projeto simples é migrado. Regra de redação decorrente: nenhum passo do manifesto pode citar valor específico de conteúdo (ex.: nome de uma página do seed) — só a mecânica da UI ("clique na página que você quer editar"), senão o texto ficaria amarrado aos dados de exemplo do template e pararia de valer para o site real do cliente.

O que foi implementado:
1. Manifesto de tutoriais em `client/src/data/helpManifest.ts` (título, categoria, recomendado, passos de texto, `capture` com rota admin + cliques de melhor-esforço) — fonte única consumida tanto pela wiki quanto pelo script de prints.
2. `scripts/generate-help-screenshots.ts` (Playwright, chamado via `npm run generate:help-screenshots`): loga com `ADMIN_EMAIL`/`ADMIN_PASSWORD`, navega cada rota do manifesto, espera qualquer texto "Carregando..." sumir antes do print (evita capturar tela em loading — `waitUntil: 'networkidle'` não serve aqui porque o dev server do Vite mantém um websocket de HMR sempre aberto), salva em `client/public/help/<id>.png`. Clique que não encontra o texto esperado só gera aviso, nunca derruba o print base.
3. Rota `/admin/ajuda` (`client/src/pages/AdminHelpPage.tsx`, registrada em `client/src/routes/AppRoutes.tsx`, item "Ajuda" no menu do `AdminLayout.tsx`): busca client-side, chips por categoria, seção "Comece por aqui" fixa (os 8 tutoriais recomendados) e capítulos numerados na ordem do admin — mesmo padrão do artefato de catálogo, sem backend novo.
4. Prints iniciais gerados e validados rodando o pipeline completo de ponta a ponta contra uma instância real (`npm run dev` local): login automático, 43/43 capturas, 0 falhas.
5. Passo 8 acrescentado à seção do README "Para uma IA assistente": depois do build/testes (passo 6), rodar `npm run generate:help-screenshots` para sobrescrever os prints pelos da instância já populada com o conteúdo do cliente.

Pendente:
- (Futuro) Checagem que avisa se o manifesto referencia uma rota/admin removida, para a wiki não acumular prints quebrados conforme o produto evolui.

Resolvido (2026-08-29): os 48 prints commitados foram regenerados contra `server/src/prisma/seed.ts` (dados genéricos, não mais o banco de desenvolvimento pessoal usado na validação original). `generate-help-screenshots.ts` também ganhou um passo explícito e logado de limpeza dos prints anteriores antes de gerar os novos (já existia como side-effect silencioso; agora é visível no output do script) — não elimina conflito de merge quando duas rodadas independentes commitam em paralelo (dois "both added" com bytes diferentes), mas garante que uma única rodada nunca mistura gerações antigas com novas.

**Fase 9 — Onboarding wizard (substitui edição manual de seed.ts)** ✅ concluída (2026-08-31)
Até aqui, gerar um site novo exigia editar `server/src/prisma/seed.ts` à mão (nav, home, páginas de exemplo) e `SiteSettings` nunca era seedado — ficava em valores default até alguém preencher via `/admin/settings`. Substituído por um assistente guiado dentro do próprio admin, em `/admin/setup`.

Decisões de escopo:
- **Roda dentro do admin, não como CLI** — reaproveita as APIs/forms admin já existentes (`PATCH /api/admin/site-settings`, rotas de nav) em vez de duplicar lógica.
- **O primeiro passo do assistente cria a conta admin** — não depende mais de `ADMIN_EMAIL`/`ADMIN_PASSWORD` no `.env` sendo aplicados por seed.
- **Escopo de conteúdo é "essencial": conta admin + `SiteSettings` essencial (nome do site, contato, WhatsApp, redes, horários) + rótulos de nav (Home/Blog).** Páginas de exemplo (Sobre/Contato) e posts continuam fora — o usuário generalizaria os placeholders da mesma forma que hoje, então o assistente não tenta substituir o editor de páginas/blog já existente.
- **A rota só pode existir uma vez por instância** (requisito de segurança explícito): gating por um flag persistido (`SiteSettings.setupCompletedAt`, não uma contagem de `User`, para não reabrir o assistente se um admin for removido depois), reivindicado atomicamente via `UPDATE ... WHERE setupCompletedAt IS NULL` dentro de uma transação — duas requisições concorrentes de `POST /api/setup/admin` nunca criam dois admins (Postgres bloqueia a segunda até a primeira committar). `GET /api/setup/status` expõe o flag; a página `/admin/setup` redireciona para `/admin/login` antes de renderizar o formulário quando o setup já foi concluído — não é só o submit que fica bloqueado, a tela inteira não abre.
- **`seed.ts` não foi removido** — continua sendo a única fonte de dados de demonstração usada pelo `lighthouse-ci.yml`. Só a documentação (README, seção "Para uma IA assistente") deixou de recomendá-lo como fluxo de onboarding de um site real.

O que foi implementado:
1. `SiteSettings.setupCompletedAt DateTime?` (migration `20260831010321_add_site_settings_setup_completed_at`).
2. `SetupRepository` (`server/src/repositories/setup.repository.ts`): `needsSetup()` e `claimAndCreateAdmin()` (upsert do singleton + claim atômico + criação do `User`, tudo em uma transação).
3. `GET /api/setup/status` e `POST /api/setup/admin`, adicionados a `auth.controller.ts`/`auth.routes.ts` (mesmo módulo de `login`/`logout`, reaproveitando `SESSION_COOKIE_NAME`/cookie de sessão).
4. `AdminSetupPage` (`client/src/pages/AdminSetupPage.tsx`, rota `/admin/setup`): wizard de 3 passos (conta → configurações essenciais, reaproveitando `SocialLinksEditor`/`OfficeHoursEditor` → menu, reaproveitando `useCreateNavbarItem`). Logo do site fica fora do wizard (o upload/crop já existe em `/admin/settings`, sem necessidade de duplicar ali). `AdminLoginPage` consulta o mesmo status e redireciona para `/admin/setup` quando ainda não há admin.

## Decisões já tomadas
- SSR customizado no Express atual (não migrar para Next.js/Remix).
- Construção acontece direto em `D:\Projetos\template`, sem tocar o site em produção da Cris durante o processo.
