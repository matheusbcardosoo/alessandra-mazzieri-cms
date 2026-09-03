import { v4 as uuidv4 } from 'uuid';
import placeholderSrc from '../assets/image-placeholder.svg';
import type {
  HeroBlockDataV1,
  HeroBlockDataV2,
  HeroBlockData,
  PageBlock,
  PageSection,
  TextBlockData,
  PillsBlockData,
  ButtonGroupBlockData,
  ImageBlockData,
  CardBlockData,
  ButtonGroupButton,
  HeroImageHeight,
  HeroLayoutVariant
} from '../types';

// ================= TYPE GUARDS =================

export function isHeroV1(data: unknown): data is HeroBlockDataV1 {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  // V1 não tem version ou version !== 2
  if ('version' in obj && obj.version === 2) return false;

  // V1 tem campos flat característicos
  return (
    'heading' in obj ||
    'subheading' in obj ||
    'ctaLabel' in obj ||
    'badges' in obj ||
    'mediaMode' in obj ||
    'singleImage' in obj ||
    'fourCards' in obj
  );
}

export function isHeroV2(data: unknown): data is HeroBlockDataV2 {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  return (
    obj.version === 2 &&
    'layout' in obj &&
    'left' in obj &&
    'right' in obj &&
    'rightVariant' in obj &&
    Array.isArray(obj.left) &&
    Array.isArray(obj.right)
  );
}

const heroImageHeightOptions: Array<Exclude<HeroImageHeight, number>> = ['sm', 'md', 'lg', 'xl'];

function mapHeightPctToImageHeight(heightPct?: number | null): Exclude<HeroImageHeight, number> | null {
  if (typeof heightPct !== 'number' || Number.isNaN(heightPct)) return null;
  if (heightPct <= 45) return 'sm';
  if (heightPct <= 65) return 'md';
  if (heightPct <= 85) return 'lg';
  return 'xl';
}

function normalizeHeroLayoutVariant(value?: HeroLayoutVariant | null): HeroLayoutVariant {
  return value === 'stacked' ? 'stacked' : 'split';
}

export function isHeroBlock(block: PageBlock): block is PageBlock & { type: 'hero' } {
  return block.type === 'hero';
}

// ================= MIGRATION FUNCTION =================

export function migrateHeroV1ToV2(heroV1: HeroBlockDataV1): HeroBlockDataV2 {
  const left: PageBlock[] = [];
  const right: PageBlock[] = [];
  
  // 1) HEADING (H1)
  if (heroV1.heading?.trim()) {
    left.push({
      id: uuidv4(),
      type: 'text',
      colSpan: 1,
      data: {
        contentHtml: `<h1>${heroV1.heading}</h1>`
      } as TextBlockData
    } as PageBlock);
  }
  
  // 2) SUBHEADING (Paragraph)
  if (heroV1.subheading?.trim()) {
    left.push({
      id: uuidv4(),
      type: 'text',
      colSpan: 1,
      data: {
        contentHtml: `<p>${heroV1.subheading}</p>`
      } as TextBlockData
    } as PageBlock);
  }
  
  // 3) BADGES -> PILLS
  if (heroV1.badges && heroV1.badges.length > 0) {
    const validBadges = heroV1.badges.filter(b => b && b.trim());
    if (validBadges.length > 0) {
      left.push({
        id: uuidv4(),
        type: 'pills',
        colSpan: 1,
        data: {
          pills: validBadges
        } as PillsBlockData
      } as PageBlock);
    }
  }
  
  // 4) BUTTONS (Primary + Secondary) -> BUTTON GROUP
  const buttons: ButtonGroupButton[] = [];
  
  if (heroV1.ctaLabel?.trim()) {
    buttons.push({
      id: uuidv4(),
      label: heroV1.ctaLabel,
      href: heroV1.ctaHref || '#',
      variant: 'primary',
      linkMode: heroV1.ctaLinkMode === 'page' ? 'page' : 'manual',
      pageKey: heroV1.ctaPageKey,
      pageId: heroV1.ctaPageId,
      slug: heroV1.ctaSlug
    });
  }
  
  if (heroV1.secondaryCta?.trim()) {
    buttons.push({
      id: uuidv4(),
      label: heroV1.secondaryCta,
      href: heroV1.secondaryHref || '#',
      variant: 'secondary',
      linkMode: heroV1.secondaryLinkMode === 'page' ? 'page' : 'manual',
      pageKey: heroV1.secondaryPageKey,
      pageId: heroV1.secondaryPageId,
      slug: heroV1.secondarySlug
    });
  }
  
  if (buttons.length > 0) {
    left.push({
      id: uuidv4(),
      type: 'buttonGroup',
      colSpan: 1,
      data: {
        buttons,
        align: 'start',
        stackOnMobile: true
      } as ButtonGroupBlockData
    } as PageBlock);
  }
  
  // 5) DETERMINE RIGHT VARIANT AND CONTENT
  let rightVariant: 'image-only' | 'cards-only' | 'cards-with-image' = 'image-only';
  
  const hasImage = heroV1.singleImage?.url;
  const hasCards = heroV1.fourCards?.medium || (heroV1.fourCards?.small && heroV1.fourCards.small.length > 0);
  
  if (hasImage && hasCards) {
    rightVariant = 'cards-with-image';
  } else if (hasCards) {
    rightVariant = 'cards-only';
  } else {
    rightVariant = 'image-only';
  }
  
  // 6) SINGLE IMAGE
  if (hasImage) {
    right.push({
      id: uuidv4(),
      type: 'image',
      colSpan: 1,
      data: {
        mediaId: heroV1.singleImage!.imageId,
        src: heroV1.singleImage!.url || '',
        alt: heroV1.singleImage!.alt || '',
        size: 100,
        align: 'center',
        heightPct: 100 // Default to 100% height
      } as ImageBlockData
    } as PageBlock);
  }
  
  // 7) FOUR CARDS (if exists)
  if (heroV1.fourCards) {
    // Medium card
    if (heroV1.fourCards.medium) {
      const medium = heroV1.fourCards.medium;
      right.push({
        id: uuidv4(),
        type: 'cards',
        colSpan: 1,
        data: {
          title: null,
          subtitle: null,
          items: [{
            id: uuidv4(),
            title: medium.title || '',
            text: medium.text || '',
            icon: medium.icon || null,
            ctaLabel: null,
            ctaHref: null
          }],
          layout: 'auto',
          variant: 'feature'
        } as CardBlockData
      } as PageBlock);
    }
    
    // Small cards (3)
    if (heroV1.fourCards.small && heroV1.fourCards.small.length > 0) {
      const smallCards = heroV1.fourCards.small.filter(c => c.title || c.text);
      if (smallCards.length > 0) {
        right.push({
          id: uuidv4(),
          type: 'cards',
          colSpan: 1,
          data: {
            title: null,
            subtitle: null,
            items: smallCards.map(card => ({
              id: uuidv4(),
              title: card.title || '',
              text: card.text || '',
              icon: card.icon || null,
              ctaLabel: null,
              ctaHref: null
            })),
            layout: '3',
            variant: 'simple'
          } as CardBlockData
        } as PageBlock);
      }
    }
  }
  
  // 8) FALLBACK: if right is empty, add placeholder image
  if (right.length === 0) {
    right.push({
      id: uuidv4(),
      type: 'image',
      colSpan: 1,
      data: {
        src: placeholderSrc,
        alt: 'Placeholder',
        size: 100,
        align: 'center',
        heightPct: 100
      } as ImageBlockData
    } as PageBlock);
  }
  
  const imageHeight = mapHeightPctToImageHeight(100) ?? 'lg';

  return {
    version: 2,
    layout: 'two-col',
    layoutVariant: 'split',
    imageHeight,
    left,
    right,
    rightVariant
  };
}

// ================= NORMALIZATION =================

export function normalizeHeroBlock(block: PageBlock): PageBlock {
  if (!isHeroBlock(block)) return block;
  
  const data = block.data as HeroBlockData;
  
  // If already V2, validate and return
  if (isHeroV2(data)) {
    return {
      ...block,
      colSpan: 999, // Force full width
      data: normalizeHeroV2(data)
    };
  }
  
  // If V1, migrate to V2
  if (isHeroV1(data)) {
    const migratedData = migrateHeroV1ToV2(data);
    return {
      ...block,
      colSpan: 999, // Force full width
      data: migratedData
    };
  }
  
  // Unknown format, return as-is
  return block;
}

function normalizeHeroV2(data: HeroBlockDataV2): HeroBlockDataV2 {
  // Ensure invariants without overwriting user choices
  const normalized = { ...data };
  normalized.layoutVariant = normalizeHeroLayoutVariant(normalized.layoutVariant);
  
  // Preserve rightVariant - NEVER reset it
  // Only ensure minimal structure if completely empty
  
  if (normalized.layoutVariant === 'stacked') {
    normalized.rightVariant = 'image-only';
  }

  if (normalized.rightVariant === 'image-only') {
    // Should have exactly 1 image, plus any purely decorative span
    // (ex.: floating-badge) layered over it — those aren't a "media mode"
    // the variant toggle needs to clean up, just an overlay on the image.
    const images = normalized.right.filter(b => b.type === 'image');
    const decorative = normalized.right.filter(b => b.type === 'span');
    if (images.length === 0) {
      // Add placeholder only if empty
      normalized.right = [{
        id: uuidv4(),
        type: 'image',
        colSpan: 1,
        data: {
          src: placeholderSrc,
          alt: 'Placeholder',
          size: 100,
          heightPct: 100
        } as ImageBlockData
      } as PageBlock, ...decorative];
    } else {
      // Keep only first image
      normalized.right = [images[0], ...decorative];
    }
  } else if (normalized.rightVariant === 'cards-only') {
    // Should have 4 cards
    const cards = normalized.right.filter(b => b.type === 'cards');
    // Don't auto-add cards, just preserve what exists
    normalized.right = cards.slice(0, 4);
  } else if (normalized.rightVariant === 'cards-with-image') {
    // Should have 1 image + cards
    const images = normalized.right.filter(b => b.type === 'image');
    const cards = normalized.right.filter(b => b.type === 'cards');
    // Preserve order: image first, then cards
    normalized.right = [...images.slice(0, 1), ...cards.slice(0, 4)];
  }

  if (
    normalized.imageHeight == null ||
    (typeof normalized.imageHeight === 'string' && !heroImageHeightOptions.includes(normalized.imageHeight))
  ) {
    const firstImage = normalized.right.find((b) => b.type === 'image') as PageBlock | undefined;
    const heightPct = firstImage?.type === 'image' ? (firstImage.data as ImageBlockData).heightPct : undefined;
    normalized.imageHeight = mapHeightPctToImageHeight(heightPct ?? null) ?? 'lg';
  }
  
  return normalized;
}

export function normalizeBlocks(blocks: PageBlock[]): PageBlock[] {
  return blocks.map(block => {
    if (isHeroBlock(block)) {
      return normalizeHeroBlock(block);
    }
    
    // Normalize Pills block: convert legacy 'items' to 'pills'
    if (block.type === 'pills') {
      const data = block.data as PillsBlockData;
      if (data.items && !data.pills) {
        return {
          ...block,
          data: {
            ...data,
            pills: data.items,
            items: undefined // Remove legacy field
          }
        };
      }
    }
    
    return block;
  });
}

// ================= DEFAULT HERO V2 =================

export function createDefaultHeroV2(): PageBlock {
  return {
    id: uuidv4(),
    type: 'hero',
    colSpan: 999, // Full width
    data: {
      version: 2,
      layout: 'two-col',
      layoutVariant: 'split',
      imageHeight: 'lg',
      left: [
        {
          id: uuidv4(),
          type: 'text',
          colSpan: 1,
          data: {
            contentHtml: '<h1>Bem-vindo</h1>'
          } as TextBlockData
        } as PageBlock,
        {
          id: uuidv4(),
          type: 'text',
          colSpan: 1,
          data: {
            contentHtml: '<p>Sua descrição aqui.</p>'
          } as TextBlockData
        } as PageBlock,
        {
          id: uuidv4(),
          type: 'buttonGroup',
          colSpan: 1,
          data: {
            buttons: [
              {
                id: uuidv4(),
                label: 'Saiba mais',
                href: '#',
                variant: 'primary',
                linkMode: 'manual'
              }
            ],
            align: 'start',
            stackOnMobile: true
          } as ButtonGroupBlockData
        } as PageBlock
      ],
      right: [
        {
          id: uuidv4(),
          type: 'image',
          colSpan: 1,
          data: {
            src: placeholderSrc,
            alt: 'Hero image',
            size: 100,
            align: 'center',
            heightPct: 100
          } as ImageBlockData
        } as PageBlock
      ],
      rightVariant: 'image-only'
    } as HeroBlockDataV2
  } as PageBlock;
}

export function ensureHeroInSection(section: PageSection): PageSection {
  // Check if section already has a Hero block
  const hasHero = section.cols?.some((col) =>
    col.blocks?.some((block) => block.type === 'hero')
  );

  if (hasHero) return section;

  // Add Hero to first column, first position
  const heroBlock = createDefaultHeroV2();

  return {
    ...section,
    cols: section.cols?.map((col, idx) => {
      if (idx === 0) {
        return {
          ...col,
          blocks: [heroBlock, ...(col.blocks || [])]
        };
      }
      return col;
    }) || [{ id: 'col-1', blocks: [heroBlock] }]
  };
}
