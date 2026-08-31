# Otimização de imagem: variante AVIF assíncrona — Design

**Data:** 2026-08-26
**Status:** Aprovado para planejamento

## Contexto

O pipeline de upload de mídia (`server/src/infra/storage/SupabaseStorageProvider.ts`)
já faz uma otimização de base: todo upload é redimensionado (máx. 1920x1920,
`fit: inside`, sem upscale) e convertido para WebP (qualidade 82) de forma
síncrona, antes de subir pro Supabase Storage. Essa parte **não muda**.

A lacuna real é: nenhuma variante em formato mais moderno (AVIF, tipicamente
30-50% menor que WebP na mesma qualidade percebida) é gerada. Este design
cobre exclusivamente isso — gerar uma variante AVIF **em background**, sem
bloquear a resposta do upload, e servi-la via `<picture>` com fallback pro
WebP já existente.

## Decisões de escopo (confirmadas com o usuário)

1. **Async sem fila persistente.** O projeto não tem infraestrutura de jobs
   hoje (Redis é só cache opcional, com fallback gracioso). A geração do AVIF
   roda fire-and-forget logo após a resposta do upload ser enviada. Se o
   processo reiniciar no meio (ex.: deploy), aquele registro de mídia fica
   permanentemente só em WebP — sem retry, sem persistência de job. Mesmo
   espírito de degradação graciosa já usado no cache Redis.
2. **Sem backfill.** Mídia já existente no banco (uploads anteriores a esta
   feature) continua servindo só WebP. Não há script/rota para reprocessar
   o histórico.
3. **Cobre os 6 blocos que renderizam `<img>` de conteúdo**: `image`,
   `media-text`, `cards`, `services`, `cta` e `hero` (V1 e V2). Nenhum desses
   blocos usa CSS `background-image` para a imagem de conteúdo — o
   `BackgroundPicker` (fundo do bloco/seção) é um conceito separado e fica
   fora de escopo.
4. **Sem geração de AVIF pra GIF.** `sharp` não preserva animação ao
   codificar AVIF a partir de um GIF (geraria só o primeiro frame) — pulado
   nesse caso, mesma checagem de mimetype que já existe para pular a
   conversão WebP de GIFs hoje.

## Arquitetura

### Backend

**Schema (`server/prisma/schema.prisma`, model `Media`):** três colunas novas,
todas nullable (a geração pode nunca completar):

```prisma
avifUrl  String?
avifPath String?
avifSize Int?
```

**`StorageProvider` (`server/src/infra/storage/StorageProvider.ts`):** novo
método na interface:

```ts
uploadAvifVariant(
  buffer: Buffer,
  basePath: string,
  options?: { maxWidth?: number; maxHeight?: number }
): Promise<{ url: string; path: string; size: number }>
```

`basePath` é o `path` já retornado por `uploadImage` (ex.:
`images/2026/08/uuid-nome.webp`) — a implementação troca a extensão para
`.avif`, garantindo que as duas variantes fiquem no mesmo diretório com o
mesmo identificador, o que simplifica o pareamento e a limpeza (delete).
Internamente roda `sharp(buffer).rotate().resize({maxWidth, maxHeight, fit:
'inside', withoutEnlargement: true}).avif({ quality: 50 }).toBuffer()` — os
mesmos parâmetros de resize do pipeline WebP, só trocando o encoder e a
qualidade (a escala de qualidade do AVIF não é comparável 1:1 com a do WebP;
50 é o equivalente perceptual aproximado ao 82 usado hoje em WebP).

**`MediaService` (`server/src/services/media.service.ts`):**

- `upload()` e `update()` mantêm o fluxo síncrono atual (resize + WebP +
  grava `Media` + responde) sem nenhuma mudança de comportamento observável.
- Logo após montar o resultado a ser retornado, cada método dispara — **sem
  `await`** — uma chamada a `generateAvifVariant(mediaId, buffer, webpPath,
  mimeType)`. Em `update()`, isso só acontece quando um novo arquivo foi de
  fato enviado (o mesmo `if (file) { ... }` que já guarda o reprocessamento
  de WebP hoje) — uma edição só de metadados (`alt`/`title`/tags) não têm
  buffer novo pra reprocessar e não dispara nada:
  - Pula silenciosamente se `mimeType === 'image/gif'`.
  - Chama `storageProvider.uploadAvifVariant(...)`.
  - Atualiza o registro via `repository.update(mediaId, { avifUrl, avifPath,
    avifSize })`.
  - Qualquer erro (encode, upload, ou `record not found` do Prisma se a
    mídia foi apagada nesse meio-tempo) é só logado
    (`logger.error`) — nunca propaga, nunca faz retry.
- `delete()` passa a também apagar `avifPath` do storage quando presente,
  além do `path` (WebP) que já apaga hoje.

Como o `Media` não é servido em nenhum endpoint público (o site público só
enxerga a URL já congelada dentro do JSON de `layout` de `Page`/`Post` — ver
seção seguinte), **não há cache público a invalidar** quando o `avifUrl` é
preenchido depois.

### API / tipos compartilhados

- **`client/src/types/auth.ts` (`Media`):** adiciona `avifUrl?: string |
  null` — passthrough direto do Prisma via `sendSuccess(res, media)`, sem
  mapeamento adicional no controller.
- **`client/src/components/ImagePickerModal.tsx`:** o payload do `onSelect`
  (hoje `{ mediaId, src, alt, width?, height?, cropData? }`) ganha
  `avifSrc?: string | null`, preenchido a partir de `image.avifUrl`
  (seleção na biblioteca) ou `newMedia.avifUrl` (upload recém-feito — quase
  sempre `null` nesse momento, já que o job de AVIF ainda não terminou;
  populado só se o usuário reabrir a biblioteca depois de o job concluir).
  Esse é o único ponto de entrada usado pelos 6 blocos, então a mudança de
  contrato acontece uma vez só.
- **`BackgroundPicker.tsx`** não muda — desestrutura só `{ mediaId, src }` e
  está fora de escopo (ver decisão 3).

### Client — renderização

**Como as imagens chegam ao layout salvo:** cada bloco copia
`mediaId`/`src`/`alt` (e agora `avifSrc`) do payload do picker para dentro
do próprio `data` do bloco no momento da escolha — o `layout` de uma
`Page`/`Post` publicada é uma cópia congelada desses campos, não uma
referência viva a `Media`. Por isso o AVIF só aparece em conteúdo editado
**depois** de o job de background ter concluído para aquela imagem
(tipicamente segundos) — reforça a decisão 2 (sem backfill): conteúdo já
publicado antes desta feature nunca ganha AVIF retroativamente.

**Componente novo — `client/src/components/OptimizedImage.tsx`:**

```tsx
type OptimizedImageProps = {
  src: string;
  avifSrc?: string | null;
} & Omit<JSX.IntrinsicElements['img'], 'src'>;

export function OptimizedImage({ src, avifSrc, ...imgProps }: OptimizedImageProps) {
  return (
    <picture>
      {avifSrc && <source type="image/avif" srcSet={avifSrc} />}
      <img src={src} {...imgProps} />
    </picture>
  );
}
```

**Pontos de troca (`<img>` → `<OptimizedImage>`), 9 ocorrências em 6 blocos:**

| Bloco | Arquivo | Tipo tocado | Ocorrências |
|---|---|---|---|
| `image` | `blocks/image/renderer.tsx` | `ImageBlockData` | 1 |
| `media-text` | `blocks/media-text/renderer.tsx` | `MediaTextBlockData` | 1 |
| `cards` | `blocks/cards/renderer.tsx` | `CardBlockData` (item) | 1 |
| `services` | `blocks/services/renderer.tsx` | `ServicesBlockData` (item) | 1 |
| `cta` | `blocks/cta/renderer.tsx` | `CtaBlockData` | 1 |
| `hero` V2 | `blocks/hero/renderer.tsx` (`renderHeroImage`) | `ImageBlockData` (via `left`/`right` aninhado) | 1 |
| `hero` V1 | `blocks/hero/renderer.tsx` (`renderSingleImage`, `renderFourCards`) | `HeroImage`, `HeroCard` | 3 |

Cada bloco (exceto hero) já tem um campo de tipo `string` pra URL da imagem
(`ImageBlockData.src`, `MediaTextBlockData.imageUrl`, etc.) — cada um ganha
um campo irmão `avifSrc?: string | null`, populado no respectivo `Form.tsx`
no mesmo lugar onde hoje copia `src`/`imageUrl` do retorno do picker.

**Hero é o único bloco com duas representações coexistentes** (não é uma
migração completa — V1 ainda é ativamente editável no `Form.tsx`, não é
código morto):

- **V2** (`left`/`right: PageBlock[]`): quando o filho é `type: 'image'`,
  o hero já lê `ImageBlockData` diretamente — herda `avifSrc` de graça
  assim que esse tipo ganhar o campo (nenhuma mudança de tipo adicional
  necessária, só o `<OptimizedImage>` em `renderHeroImage`).
- **V1** (legado): `HeroImage` (`imageId/url/alt/focal`) e `HeroCard`
  (`imageId/url/alt/...`) ganham `avifSrc?: string | null`. Os 3 pontos em
  `hero/Form.tsx` que hoje copiam `{ imageId: image.mediaId, url: image.src,
  alt: image.alt }` (para `singleImage`, `fourCards.medium`,
  `fourCards.small[i]`) passam a copiar `avifSrc: image.avifSrc` junto.

### Fora de escopo (não faz parte deste design)

- Imagens responsivas / `srcset` com múltiplos tamanhos (breakpoints).
- Fila de jobs persistente (BullMQ ou equivalente) — decisão 1.
- Backfill de mídia já existente — decisão 2.
- Suporte a AVIF em `background-image` (CSS `image-set()`) — o
  `BackgroundPicker` fica fora de escopo (decisão 3).
- Limitação de concorrência do encode de AVIF sob upload em massa — CPU-bound,
  YAGNI para v1; tradeoff conhecido e aceito.

## Tratamento de erro

- Falha do `sharp` ao codificar AVIF, ou falha do upload da variante pro
  Supabase → capturada, só `logger.error`, `Media` fica sem `avifUrl`
  permanentemente. Não afeta a resposta do upload, já enviada antes.
- Corrida upload → delete (mídia apagada antes do job de AVIF terminar): o
  `repository.update` falha com erro "record not found" do Prisma — esse
  erro específico é identificado e ignorado (não é uma falha real, é uma
  mídia que deixou de existir por ação legítima do usuário).
- GIF: verificação de mimetype antes de sequer chamar `uploadAvifVariant`.

## Testes

Vitest nos dois lados, seguindo o padrão de mocks já usado em
`server/src/utils/health.test.ts`:

- **`SupabaseStorageProvider`**: teste unitário de `uploadAvifVariant` com o
  client do Supabase mockado — valida a troca de extensão `.webp` → `.avif`
  no path de destino e os parâmetros passados ao `sharp`.
- **`MediaService.upload`/`update`**: valida que a promise principal resolve
  (e retorna) antes do `repository.update` da variante AVIF ser chamado —
  confirma o fire-and-forget — e que uma rejeição nesse job em background
  não faz a promise principal rejeitar.
- **`OptimizedImage`** (client, React Testing Library): renderiza
  `<source type="image/avif">` quando `avifSrc` está presente; omite o
  `<source>` quando `avifSrc` é `null`/`undefined`, mantendo só o `<img>`.

Sem teste de browser/e2e novo. Verificação manual pós-implementação: upload
de uma imagem → WebP aparece imediatamente na resposta → aguardar alguns
segundos → reabrir a biblioteca de mídia → `avifUrl` já presente → inserir
essa imagem num bloco (`image`, por exemplo) → conferir no DOM que o
`<picture>` renderizado tem `<source type="image/avif">` apontando pro
arquivo `.avif`.
