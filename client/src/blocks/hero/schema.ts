export type { HeroBlockData, HeroBlockDataV2, HeroBlockDataV1, HeroMediaMode, HeroImage, HeroCard, HeroFourCards, HeroLayoutVariant, HeroImageHeight } from '@/types';
import type { HeroBlockData } from '@/types';

export const heroDefault: HeroBlockData = {
  version: 2,
  layout: 'two-col',
  layoutVariant: 'split',
  imageHeight: 'lg',
  rightVariant: 'image-only',
  left: [],
  right: []
};
