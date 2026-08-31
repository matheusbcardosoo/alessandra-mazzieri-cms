# Histórico de Versões — Aviso de Mídia Removida — Spec

Source: conversa de validação do fluxo de revert (histórico de versões, `4f930f3`), 2026-08-30.

## Problema

`PageVersionService.snapshot()` grava o `layout` de cada publicação como JSON solto — sem FK para `Media`. `MediaService.delete()` apaga arquivo de storage + linha do banco sem checar se algum `Page.layout`/`PageVersion.layout` ainda referencia aquele id. Como `normalizePageLayout()` só valida que `image.data.src` é uma URL http(s) sintaticamente válida (não que ela resolve), tanto salvar quanto reverter uma página seguem em frente mesmo quando um bloco aponta para uma mídia que não existe mais. O resultado é silencioso: a página publica normalmente, mas a imagem quebra no site público (ícone de imagem quebrada do navegador), e o admin só percebe olhando a página publicada.

Isso vale tanto para o fluxo de revert quanto para mídia apagada por qualquer outro caminho (ex.: removida direto na tela de Mídia enquanto ainda em uso).

## Escopo

1. Um walker recursivo, server-side, que soma toda referência a `Media` dentro de um `layout` (`PageLayoutV2`), cobrindo todos os tipos de bloco que carregam imagem: `image`, `hero` (V1 e V2, incluindo os sub-blocos aninhados em `hero.data.left`/`right`), `cards` (ícone tipo imagem), `cta`, `media-text`, `services`.
2. Uma função que cruza essas referências contra a tabela `Media` e devolve as que não existem mais.
3. O histórico de versões (`GET /admin/pages/:id/versions`) passa a incluir, por versão, quais blocos referenciam mídia ausente — usado para avisar o admin na lista e na confirmação de revert, antes de reverter.
4. Um novo endpoint que roda a mesma checagem contra o layout **atual e salvo** da página (não uma versão histórica) — usado pelo editor para destacar visualmente, toda vez que abre, quais blocos precisam de nova imagem. Cobre revert e qualquer outra forma de mídia ter sumido.
5. O revert em si continua de graça — sem novo parâmetro/contrato. O aviso é só informativo; o admin decide se reverte mesmo assim clicando em "Reverter" como já faz hoje.

## Arquitetura

### Server — walker e checagem (compartilhados)

Novo módulo `server/src/services/mediaReferences.service.ts`:

```ts
export type MediaRef = { blockId: string; mediaId: string };

export function collectMediaRefs(layout: PageLayoutV2): MediaRef[]
export async function findMissingMedia(layout: PageLayoutV2): Promise<MediaRef[]>
```

- `collectMediaRefs` percorre `sections → cols → blocks`. Para cada bloco, extrai o(s) campo(s) de mídia relevante(s) ao seu tipo (ver lista no Escopo item 1). Uma referência aninhada dentro de um Hero (V1 `singleImage`/`fourCards`, V2 `left`/`right`) é atribuída ao **id do próprio bloco Hero de topo**, nunca ao id do sub-bloco interno — o Hero é selecionado/editado como uma unidade só no editor (`isLocked: true`), então não faz sentido destacar um sub-bloco que o admin não consegue selecionar isoladamente. Ids vazios/nulos são ignorados. A função é pura, sem I/O — opera sobre o layout já normalizado (`PageLayoutV2`), sem revalidar com Zod (o mesmo padrão tolerante já usado por `validateHeroLayout`, que também lê o layout como JSON solto).
- `findMissingMedia` chama `collectMediaRefs`, deduplica os `mediaId`s, faz um único `prisma.media.findMany({ where: { id: { in: ids } }, select: { id: true } })` (pula a query se não houver ids) e devolve as refs cujo id não voltou.

Este módulo é consumido por dois lugares — histórico de versões e checagem do layout atual — sem duplicar a query.

### Server — histórico de versões avisa antes do revert

`PageVersionService.list(pageId)` (`server/src/services/pageVersion.service.ts`) passa a mapear cada `PageVersion` retornada, anexando `missingMedia: MediaRef[]` (chamando `findMissingMedia(version.layout as PageLayoutV2)` por versão — o limite de histórico, `PAGE_VERSION_HISTORY_LIMIT`, é 10 por padrão, então isso é no máximo 10 queries extra de `Media`, só quando o admin abre o modal de histórico).

`GET /admin/pages/:id/versions` (controller `listPageVersions`, já existe) não muda de rota — só o shape da resposta ganha o campo novo por item.

O revert (`POST /admin/pages/:id/versions/:versionId/revert`) **não muda de contrato**. O client já tem a lista de `missingMedia` de cada versão vinda do `GET` anterior; usa isso pra montar o aviso antes de decidir chamar o revert.

### Server — novo endpoint para o layout atual

Novo endpoint `GET /admin/pages/:id/missing-media`, montado em `admin.routes.ts` ao lado das outras rotas de página, com o mesmo guard `requirePageAccess(resolveParamPageId)` das rotas de versão:

```ts
adminRoutes.get('/admin/pages/:id/missing-media', requirePageAccess(resolveParamPageId), getPageMissingMedia);
```

Controller novo em `pages.controller.ts`:

```ts
export async function getPageMissingMedia(req: Request, res: Response) {
  const { id } = uuidParamSchema.parse(req.params);
  const page = await service.getAdminById(id);
  const data = await findMissingMedia(page.layout as PageLayoutV2);
  return sendSuccess(res, data);
}
```

Funciona igual para a home: `service.getAdminById(id)` lê o `Page` genérico direto do repositório (o mesmo registro que `HomeService` também lê) — não precisa do roteamento especial por `HomeService`/`BlogService` que `getPageAdmin` tem, porque só o campo `layout` interessa aqui, e esse campo é idêntico independente de qual service o serve. Blog não tem esse endpoint disponível pois não usa o sistema de blocos (seu `layout` é a config fixa de seções, não `PageLayoutV2`) — a rota nunca é chamada pra ele porque o client só oferece histórico/revert para páginas normais e a home.

### Client — aviso na lista de versões e na confirmação de revert

`client/src/types/layout.ts`: `PageVersion` ganha `missingMedia: { blockId: string; mediaId: string }[]`.

`PageVersionHistoryModal.tsx`:
- cada item da lista mostra um aviso inline quando `version.missingMedia.length > 0` (ex.: "⚠ 2 imagens desta versão não existem mais e precisarão ser reenviadas").
- o `ConfirmModal` de reverter, quando a versão selecionada tem `missingMedia`, troca sua descrição padrão por uma que menciona a contagem e deixa explícito que será preciso reenviar as imagens depois de reverter. Continua sendo um único clique de confirmação — não um passo extra.

### Client — destaque no editor, recalculado a cada abertura

Novo hook `usePageMissingMedia(pageId)` em `client/src/hooks/queries/usePages.ts`, chamando `fetchPageMissingMedia(id)` (novo em `api/queries.ts`, `GET /admin/pages/:id/missing-media`). Query key `['admin', 'pages', pageId, 'missing-media']`.

`AdminPageEditorPage/index.tsx` chama esse hook ao montar (mesmo `pageId` do editor atual — funciona igual para Home, que reusa este mesmo componente) e deriva `brokenMediaBlockIds = useMemo(() => new Set(missingMedia?.map(m => m.blockId) ?? []), [missingMedia])`.

Invalidação: a query `['admin', 'pages', pageId, 'missing-media']` é invalidada no `onSuccess` de `useUpdatePage`, `usePublishPage` e `useRevertPageVersion` (as três mutações que podem mudar o `layout` persistido de uma página) — assim o destaque reflete sempre o último conteúdo salvo, nunca dados desatualizados de antes de uma edição.

`brokenMediaBlockIds` é passado como prop através de `SectionEditor` até `EditableBlock.tsx` (o wrapper único por onde todo bloco de topo passa, `client/src/pages/AdminPageEditorPage/components/EditableBlock.tsx`). Novo prop `hasBrokenMedia?: boolean` adiciona uma classe (`is-broken-media`, estilo similar ao já existente `is-hidden`) e um pequeno badge/ícone de alerta no cartão do bloco, com texto (ex. tooltip) indicando que a imagem precisa ser reenviada.

**Trade-off explícito:** como a checagem é contra o layout **salvo** (não o rascunho em memória), se o admin trocar a imagem quebrada mas ainda não salvar, o aviso permanece até o próximo save — mesmo comportamento que a validação de imagem quebrada já existente (`usePageValidation`, que só reavalia via novo carregamento) tem hoje. Não é um bug novo, é consistente com o padrão já estabelecido no editor.

## Fluxo (revert com mídia ausente)

1. Admin abre "Histórico" na página X. `GET /admin/pages/:id/versions` volta com `missingMedia` por versão.
2. Uma das versões mostra "⚠ 1 imagem não existe mais". Admin clica "Reverter" nela.
3. `ConfirmModal` mostra a descrição avisando que 1 imagem precisará ser reenviada. Admin confirma.
4. `POST .../revert` roda normal (sem mudança de contrato), página é republicada.
5. `onReverted` invalida `['admin', 'pages', pageId, 'missing-media']` (via `useRevertPageVersion`).
6. Editor recarrega o conteúdo revertido; `usePageMissingMedia` busca de novo, agora contra o layout recém-persistido; o(s) bloco(s) afetado(s) aparecem destacados no canvas.
7. Admin reenvia a imagem no bloco destacado e salva; próxima invalidação limpa o destaque (o `mediaId` do bloco não está mais na lista de ausentes).

## Acceptance criteria

- `collectMediaRefs` cobre `image`, `hero` V1 (`singleImage`, `fourCards.medium`, `fourCards.small[]`), `hero` V2 (recursivo em `left`/`right`, atribuindo ao id do Hero de topo), `cards` (itens com `iconType: 'image'`), `cta`, `media-text`, `services` (`iconImageId` de topo + itens).
- `findMissingMedia` faz no máximo uma query a `Media` por chamada (ids deduplicados), e nenhuma query quando o layout não referencia mídia nenhuma.
- `GET /admin/pages/:id/versions` inclui `missingMedia` por versão sem quebrar consumidores existentes do array (campo aditivo).
- `GET /admin/pages/:id/missing-media` funciona para páginas normais e para a home (mesmo `id` real da home), respeita `requirePageAccess` (editor sem acesso à página recebe 403 igual às outras rotas de página).
- Revert continua funcionando exatamente como hoje quando não há mídia ausente (nenhuma regressão no fluxo feliz).
- O modal de histórico mostra o aviso por versão e o `ConfirmModal` de revert reflete a contagem da versão selecionada.
- Após reverter para uma versão com mídia ausente, o(s) bloco(s) afetado(s) aparecem destacados no editor sem precisar de reload manual da página do navegador.
- Salvar/publicar a página com a imagem corrigida remove o destaque na próxima leitura (sem precisar reabrir o editor do zero — a invalidação de query já cobre isso).
- Testes novos cobrem: `collectMediaRefs` (cada tipo de bloco, caso aninhado do Hero, ids nulos/ausentes ignorados), `findMissingMedia` (dedupe, zero-query no caso vazio, mistura de existentes/ausentes), `PageVersionService.list` (campo `missingMedia` presente), o novo controller `getPageMissingMedia` (200 com dados corretos, 403 via guard existente), e no client o `PageVersionHistoryModal` (aviso renderizado) e `EditableBlock`/`SectionEditor` (prop `hasBrokenMedia` aplica a classe).

## Non-goals

- Não bloquear `MediaService.delete()` quando a mídia está em uso em algum `Page.layout` — fora de escopo desta spec (poderia ser um pedido futuro separado).
- Não recalcular o destaque reativamente a partir do rascunho em memória do editor (ver trade-off explícito acima) — só a partir do conteúdo salvo.
- Não estender a checagem para `Post`/artigos do blog nem para `SiteSettings` (logo, imagens de branding) — escopo é só `Page.layout` (páginas normais + home) e seu histórico de versões.
- Não adiciona nenhum novo parâmetro/flag ao endpoint de revert — o aviso é puramente informativo antes do clique, o contrato de revert não muda.
- Não integra esse sinal (mídia ausente por id) ao canal de validação já existente no editor (`usePageValidation`, que detecta imagem quebrada só do bloco `image` via probe de URL no rascunho em memória, e alimenta toasts/`ValidationErrorsModal` no momento de publicar). Os dois canais coexistem sem cruzamento: para o bloco `image`, o admin pode ver os dois avisos (URL quebrada + badge de mídia ausente) ao mesmo tempo; para hero/cards/cta/media-text/services, a publicação não bloqueia nem avisa sobre mídia ausente — só o badge no canvas e o aviso no histórico de versões cobrem esses tipos. Unificar os dois canais (ex.: alimentar `missingMedia` em `validationErrors`) é um pedido futuro separado, não coberto por este plano (achado da revisão final de branch, 2026-08-30).
