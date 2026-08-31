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
