import { randomUUID } from 'crypto';
import { z } from 'zod';
import { sanitizeContent } from './sanitize';
import { HttpError } from './errors';

const allowedImageSizes = [25, 50, 75, 100] as const;
const allowedImageAligns = ['left', 'center', 'right'] as const;
const allowedButtonVariants = ['primary', 'secondary', 'ghost'] as const;
const allowedHeroMediaModes = ['single_image', 'cards_only', 'four_cards'] as const;

export type HeroMediaMode = (typeof allowedHeroMediaModes)[number];

export type HeroImage = {
  imageId?: string | null;
  url?: string | null;
  alt?: string | null;
  focal?: { x: number; y: number; zoom: number } | null;
};

export type HeroCard = {
  title: string;
  text: string;
  icon?: string | null;
  imageId?: string | null;
  url?: string | null;
  alt?: string | null;
};

export type HeroFourCards = {
  medium: HeroCard;
  small: HeroCard[]; // always length 3 after normalization
};

// Hero V1 (legacy)
export type HeroBlockDataV1 = {
  heading?: string | null;
  subheading?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ctaLinkMode?: 'page' | 'manual' | null;
  ctaPageKey?: string | null;
  ctaPageId?: string | null;
  ctaSlug?: string | null;
  secondaryCta?: string | null;
  secondaryHref?: string | null;
  secondaryLinkMode?: 'page' | 'manual' | null;
  secondaryPageKey?: string | null;
  secondaryPageId?: string | null;
  secondarySlug?: string | null;
  badges?: string[] | null;
  mediaMode?: HeroMediaMode | null;
  singleImage?: HeroImage | null;
  singleCard?: { quote?: string | null; author?: string | null } | null;
  fourCards?: HeroFourCards | null;
};

// Hero V2 (new composite structure)
export type HeroBlockDataV2 = {
  version: 2;
  layout: 'two-col';
  layoutVariant?: 'split' | 'stacked';
  imageHeight?: 'sm' | 'md' | 'lg' | 'xl' | number | null;
  left: PageBlock[];
  right: PageBlock[];
  rightVariant: 'image-only' | 'cards-only' | 'cards-with-image';
};

export type HeroBlockData = HeroBlockDataV1 | HeroBlockDataV2;

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type FaqBlockData = {
  title?: string | null;
  subtitle?: string | null;
  items: FaqItem[];
  defaultOpenIndex?: number | null;
};

const baseBlockSchema = z.object({
  id: z.string().min(6).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  isLocked: z.boolean().optional(),
  visible: z.boolean().optional(),
  colSpan: z.number().int().min(1).max(999).optional(),
  rowIndex: z.number().int().min(0).optional()
});

const textBlockSchema = baseBlockSchema.extend({
  type: z.literal('text'),
  data: z.object({
    contentHtml: z.string().default(''),
    width: z.enum(['normal', 'wide']).optional(),
    background: z.enum(['none', 'soft']).optional()
  })
});

const imageBlockSchema = baseBlockSchema.extend({
  type: z.literal('image'),
  data: z.object({
    mediaId: z.string().optional().nullable(),
    src: z.string().min(1),
    alt: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    caption: z.string().optional().nullable(),
    size: z.union([z.literal(25), z.literal(50), z.literal(75), z.literal(100)]).optional(),
    align: z.enum(allowedImageAligns).optional(),
    cropRatio: z.enum(['16:9', '9:16', '1:1', '4:3', 'free']).optional().nullable(),
    naturalWidth: z.number().optional().nullable(),
    naturalHeight: z.number().optional().nullable(),
    cropX: z.number().optional().nullable(),
    cropY: z.number().optional().nullable(),
    cropWidth: z.number().optional().nullable(),
    cropHeight: z.number().optional().nullable(),
    heightPct: z.number().min(0).max(100).optional().nullable()
  })
});

const buttonBlockSchema = baseBlockSchema.extend({
  type: z.literal('button'),
  data: z.object({
    label: z.string().min(1),
    href: z.string().min(1),
    linkMode: z.enum(['page', 'manual']).optional().nullable(),
    pageKey: z.string().optional().nullable(),
    pageId: z.string().optional().nullable(),
    slug: z.string().optional().nullable(),
    newTab: z.boolean().optional(),
    variant: z.enum(allowedButtonVariants).optional(),
    icon: z.string().optional().nullable()
  })
});

const cardItemSchema = z.object({
  id: z.string().min(1),
  icon: z.string().optional().nullable(),
  iconType: z.enum(['emoji', 'image']).optional().nullable(),
  iconImageUrl: z.string().optional().nullable(),
  iconImageId: z.string().optional().nullable(),
  iconAlt: z.string().optional().nullable(),
  title: z.string().min(1),
  text: z.string().min(1),
  ctaLabel: z.string().optional().nullable(),
  ctaHref: z.string().optional().nullable()
});

const cardBlockSchema = baseBlockSchema.extend({
  type: z.literal('cards'),
  data: z.object({
    title: z.string().optional().nullable(),
    subtitle: z.string().optional().nullable(),
    items: z.array(cardItemSchema).min(1).max(12),
    layout: z.enum(['auto', '2', '3', '4']).default('auto'),
    // 'earthy' mantido para compatibilidade; normalizado para 'feature'.
    variant: z.enum(['feature', 'simple', 'borderless', 'earthy']).default('feature'),
    borderColorMode: z.enum(['default', 'custom']).optional(),
    borderColor: z.string().optional().nullable(),
    cardColorMode: z.enum(['default', 'custom']).optional(),
    cardColor: z.string().optional().nullable(),
    textColorMode: z.enum(['light', 'dark', 'custom']).optional(),
    titleColor: z.string().optional().nullable(),
    textColor: z.string().optional().nullable()
  })
});

const formFieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['text', 'email', 'tel', 'textarea', 'select']),
  label: z.string().min(1),
  placeholder: z.string().optional().nullable(),
  required: z.boolean(),
  options: z.array(z.string()).optional().nullable()
});

const formBlockSchema = baseBlockSchema.extend({
  type: z.literal('form'),
  data: z.object({
    title: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    fields: z.array(formFieldSchema).min(1).max(20),
    submitLabel: z.string().optional(),
    successMessage: z.string().optional(),
    storeSummaryKeys: z.array(z.string()).optional(),
    layout: z.enum(['1', '2']).optional()
  })
});

// ButtonGroup and Pills blocks for Hero V2
const buttonGroupButtonSchema = z.object({
  id: z.string().min(1).optional(),
  label: z.string().min(1),
  href: z.string().min(1),
  linkMode: z.enum(['page', 'manual']).optional().nullable(),
  pageKey: z.string().optional().nullable(),
  pageId: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  variant: z.enum(allowedButtonVariants).optional(),
  icon: z.string().optional().nullable(),
  newTab: z.boolean().optional()
});

const buttonGroupBlockSchema = baseBlockSchema.extend({
  type: z.literal('buttonGroup'),
  data: z.object({
    buttons: z.array(buttonGroupButtonSchema).min(0).max(5),
    alignment: z.enum(['left', 'center', 'right']).optional(),
    align: z.enum(['start', 'center', 'end']).optional(),
    stackOnMobile: z.boolean().optional()
  })
});

const pillItemSchema = z.object({
  text: z.string(),
  href: z.string().nullable().optional(),
  linkMode: z.enum(['manual', 'article']).nullable().optional(),
  articleSlug: z.string().nullable().optional()
});

const pillsBlockSchema = baseBlockSchema.extend({
  type: z.literal('pills'),
  data: z.object({
    pills: z.array(z.union([z.string(), pillItemSchema])).min(0).max(10).default([]),
    items: z.array(z.string()).min(0).max(10).optional(), // Legacy support
    size: z.enum(['xs', 'sm', 'md']).optional(),
    variant: z.enum(['neutral', 'primary', 'accent']).optional()
  })
});

const spanBlockSchema = baseBlockSchema.extend({
  type: z.literal('span'),
  data: z.object({
    // 'divider'/'spacer' mantidos por compatibilidade com dados antigos.
    kind: z.enum(['accent-bar', 'muted-text', 'floating-badge', 'eyebrow', 'divider', 'spacer']).optional(),
    text: z.string().optional().nullable(),
    icon: z.string().optional().nullable()
  })
});

const recentPostsBlockSchema = baseBlockSchema.extend({
  type: z.literal('recent-posts'),
  data: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    ctaLabel: z.string().optional(),
    ctaHref: z.string().optional(),
    ctaLinkMode: z.enum(['page', 'manual']).optional(),
    ctaPageKey: z.string().optional().nullable(),
    ctaPageId: z.string().optional().nullable(),
    ctaSlug: z.string().optional().nullable(),
    postsLimit: z.number().int().min(1).max(12).optional()
  })
});

const socialLinksBlockSchema = baseBlockSchema.extend({
  type: z.literal('social-links'),
  data: z.object({
    title: z.string().optional().nullable(),
    variant: z.enum(['list', 'chips', 'buttons']).optional(),
    showIcons: z.boolean().optional(),
    columns: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    align: z.enum(['left', 'center', 'right']).optional()
  })
});

const whatsappCtaBlockSchema = baseBlockSchema.extend({
  type: z.literal('whatsapp-cta'),
  data: z.object({
    label: z.string().optional(),
    style: z.enum(['primary', 'secondary']).optional(),
    openInNewTab: z.boolean().optional(),
    hideWhenDisabled: z.boolean().optional()
  })
});

const contactInfoBlockSchema = baseBlockSchema.extend({
  type: z.literal('contact-info'),
  data: z.object({
    titleHtml: z.string(),
    descriptionHtml: z.string().optional(),
    whatsappLabel: z.string(),
    whatsappVariant: z.enum(['primary', 'secondary', 'tertiary', 'badge']),
    socialLinksTitle: z.string(),
    socialLinksVariant: z.enum(['list', 'icons'])
  })
});

const servicesItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().max(160).optional(),
  href: z.string().min(1),
  linkMode: z.enum(['page', 'manual']).optional().nullable(),
  pageId: z.string().optional().nullable(),
  pageKey: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  iconImageId: z.string().optional().nullable(),
  iconImageUrl: z.string().optional().nullable(),
  iconAlt: z.string().optional().nullable()
});

const servicesBlockSchema = baseBlockSchema.extend({
  type: z.literal('services'),
  data: z.object({
    sectionTitle: z.string().min(1),
    items: z.array(servicesItemSchema).min(1).max(8),
    buttonLabel: z.string().optional(),
    textColorMode: z.enum(['default', 'custom']).optional(),
    textColor: z.string().optional().nullable(),
    buttonColorMode: z.enum(['default', 'custom']).optional(),
    buttonColor: z.string().optional().nullable(),
    iconImageId: z.string().optional().nullable(),
    iconImageUrl: z.string().optional().nullable(),
    iconAlt: z.string().optional().nullable()
  })
});

const ctaBlockSchema = baseBlockSchema.extend({
  type: z.literal('cta'),
  data: z.object({
    title: z.string().optional().nullable(),
    text: z.string().optional().nullable(),
    ctaLabel: z.string().optional().nullable(),
    ctaHref: z.string().optional().nullable(),
    ctaLinkMode: z.enum(['page', 'manual']).optional().nullable(),
    ctaPageKey: z.string().optional().nullable(),
    ctaPageId: z.string().optional().nullable(),
    ctaSlug: z.string().optional().nullable(),
    imageId: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    imageAlt: z.string().optional().nullable(),
    imageSide: z.enum(['left', 'right']).optional(),
    imageDissolve: z.boolean().optional(),
    imageDissolveStrength: z.enum(['soft', 'medium', 'strong']).optional()
  })
});

const faqItemSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1)
});

const faqBlockSchema = baseBlockSchema.extend({
  type: z.literal('faq'),
  data: z.object({
    title: z.string().optional().nullable(),
    subtitle: z.string().optional().nullable(),
    items: z.array(faqItemSchema).min(1).max(20),
    defaultOpenIndex: z.number().int().min(0).optional().nullable()
  })
});

const mediaTextBlockSchema = baseBlockSchema.extend({
  type: z.literal('media-text'),
  data: z.object({
    contentHtml: z.string().default(''),
    imageId: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    imageAlt: z.string().optional().nullable(),
    imageSide: z.enum(['left', 'right']).optional(),
    imageWidth: z.union([z.literal(25), z.literal(50), z.literal(75), z.literal(100)]).optional(),
    imageHeight: z.union([z.literal(25), z.literal(50), z.literal(75), z.literal(100)]).optional(),
    customImageWidthPct: z.number().int().min(1).max(100).optional().nullable(),
    // Legacy support
    imageWidthPct: z.number().optional(),
    customImageWidthPx: z.number().optional().nullable(),
    customImageHeightPct: z.number().optional().nullable(),
    customImageHeightPx: z.number().optional().nullable()
  })
});

const heroCardSchema = z.object({
  title: z.string().optional().nullable(),
  text: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  imageId: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  alt: z.string().optional().nullable()
});

const heroImageHeightOptions = ['sm', 'md', 'lg', 'xl'] as const;

function mapHeroHeightPctToPreset(heightPct?: number | null): (typeof heroImageHeightOptions)[number] | null {
  if (typeof heightPct !== 'number' || Number.isNaN(heightPct)) return null;
  if (heightPct <= 45) return 'sm';
  if (heightPct <= 65) return 'md';
  if (heightPct <= 85) return 'lg';
  return 'xl';
}

function normalizeHeroImageHeight(raw: unknown, rightBlocks: PageBlock[]): (typeof heroImageHeightOptions)[number] | number {
  if (typeof raw === 'string' && heroImageHeightOptions.includes(raw as (typeof heroImageHeightOptions)[number])) {
    return raw as (typeof heroImageHeightOptions)[number];
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(120, Math.min(Math.round(raw), 2000));
  }
  const firstImage = rightBlocks.find((b) => b.type === 'image') as PageBlock | undefined;
  const heightPct = firstImage?.type === 'image' ? (firstImage.data as ImageBlockData).heightPct : undefined;
  return mapHeroHeightPctToPreset(heightPct ?? null) ?? 'lg';
}

// Hero V1 data schema (legacy)
const heroV1DataSchema = z.object({
  version: z.literal(1).optional(), // V1 may not have version field
  heading: z.string().optional().nullable(),
  subheading: z.string().optional().nullable(),
  ctaLabel: z.string().optional().nullable(),
  ctaHref: z.string().optional().nullable(),
  ctaLinkMode: z.enum(['page', 'manual']).optional().nullable(),
  ctaPageKey: z.string().optional().nullable(),
  ctaPageId: z.string().optional().nullable(),
  ctaSlug: z.string().optional().nullable(),
  secondaryCta: z.string().optional().nullable(),
  secondaryHref: z.string().optional().nullable(),
  secondaryLinkMode: z.enum(['page', 'manual']).optional().nullable(),
  secondaryPageKey: z.string().optional().nullable(),
  secondaryPageId: z.string().optional().nullable(),
  secondarySlug: z.string().optional().nullable(),
  badges: z.array(z.string()).optional().nullable(),
  mediaMode: z.enum([...allowedHeroMediaModes, 'single_card'] as const).optional().nullable(),
  singleImage: z
    .object({
      imageId: z.string().optional().nullable(),
      url: z.string().optional().nullable(),
      alt: z.string().optional().nullable(),
      focal: z
        .object({
          x: z.number(),
          y: z.number(),
          zoom: z.number()
        })
        .optional()
        .nullable()
    })
    .optional()
    .nullable(),
  singleCard: z
    .object({
      quote: z.string().optional().nullable(),
      author: z.string().optional().nullable()
    })
    .optional()
    .nullable(),
  fourCards: z
    .object({
      medium: heroCardSchema,
      small: z.array(heroCardSchema).length(3).optional().nullable()
    })
    .optional()
    .nullable()
});

// Lazy schema for recursive PageBlock reference in Hero V2 (a hero block's
// left/right columns can themselves contain blocks, including other hero
// blocks). `z.ZodType<T>` needs a concrete T to break the circular inference,
// but no non-`any` T is sound here: the schema's true inferred shape has
// id/createdAt/updatedAt optional (filled in later by normalizePageLayout),
// while `PageBlock` requires them — and since a hero block can recursively
// contain another hero block, that mismatch recurses infinitely through
// `HeroBlockDataV2.left/right` too. This is a known Zod/TypeScript limitation
// for deeply self-referential recursive schemas, not a shortcut: every other
// `any` in this codebase's recursive-block handling has a real type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pageBlockSchemaLazy: z.ZodType<any> = z.lazy(() => pageBlockSchema);

// Hero V2 data schema (composite with nested blocks)
const heroV2DataSchema = z.object({
  version: z.literal(2),
  layout: z.literal('two-col'),
  layoutVariant: z.enum(['split', 'stacked']).optional(),
  imageHeight: z.union([z.enum(['sm', 'md', 'lg', 'xl']), z.number().int().min(120).max(2000)]).optional().nullable(),
  left: z.array(pageBlockSchemaLazy),
  right: z.array(pageBlockSchemaLazy),
  rightVariant: z.enum(['image-only', 'cards-only', 'cards-with-image'])
});

// Hero block accepts both V1 and V2
const heroBlockSchema = baseBlockSchema.extend({
  type: z.literal('hero'),
  data: z.union([heroV1DataSchema, heroV2DataSchema])
});

export const pageBlockSchema = z.discriminatedUnion('type', [
  textBlockSchema,
  imageBlockSchema,
  buttonBlockSchema,
  buttonGroupBlockSchema,
  pillsBlockSchema,
  spanBlockSchema,
  recentPostsBlockSchema,
  socialLinksBlockSchema,
  whatsappCtaBlockSchema,
  contactInfoBlockSchema,
  servicesBlockSchema,
  ctaBlockSchema,
  mediaTextBlockSchema,
  cardBlockSchema,
  formBlockSchema,
  heroBlockSchema,
  faqBlockSchema
]);

// Formato tolerante para a checagem semântica pré-Zod abaixo: os campos são
// todos opcionais de propósito, já que `layout` aqui pode ser JSON arbitrário
// ainda não validado (é por isso que essa checagem roda antes do parse Zod).
type LooseHeroRightBlock = { type?: string; data?: { src?: unknown } };
type LooseLayout = {
  sections?: Array<{
    cols?: Array<{
      blocks?: Array<{
        type?: string;
        data?: { version?: number; rightVariant?: string; right?: LooseHeroRightBlock[] };
      }>;
    }>;
  }>;
};

/**
 * Validação semântica amigável do bloco Hero, executada ANTES do parse do Zod
 * para devolver mensagens claras ao editor (em vez de erros de schema crípticos).
 */
export function validateHeroLayout(layout: unknown): void {
  const anyLayout = layout as LooseLayout;
  const sections = anyLayout?.sections;
  if (!Array.isArray(sections)) return;

  for (const section of sections) {
    for (const col of section?.cols ?? []) {
      for (const block of col?.blocks ?? []) {
        if (block?.type !== 'hero') continue;
        const data = block.data ?? {};
        if (data.version !== 2) continue;

        const variant = data.rightVariant;
        const needsImage = variant === 'image-only' || variant === 'cards-with-image';
        if (!needsImage) continue;

        const right = Array.isArray(data.right) ? data.right : [];
        const hasValidImage = right.some(
          (b) =>
            b?.type === 'image' && typeof b?.data?.src === 'string' && b.data.src.trim().length > 0
        );

        if (!hasValidImage) {
          throw new HttpError(
            400,
            'O Hero está configurado para exibir uma imagem na coluna direita, mas nenhuma imagem foi adicionada. Envie uma imagem na coluna direita do Hero ou altere o layout para "apenas cards" antes de salvar.'
          );
        }
      }
    }
  }
}

// V1 Layout Schema (legacy)
const pageLayoutSchemaV1 = z.object({
  version: z.literal(1),
  columns: z.number().int().min(1).max(3).default(1),
  cols: z
    .array(
      z.object({
        id: z.string().min(1).optional(),
        blocks: z.array(pageBlockSchema).default([])
      })
    )
    .default([])
});

// V2 Layout Schema (sections-based)
const sectionSettingsSchema = z
  .object({
    background: z.enum(['none', 'soft', 'dark', 'earthy']).optional(),
    backgroundStyle: z.enum(['none', 'soft', 'dark', 'earthy']).optional(),
    padding: z.enum(['normal', 'compact', 'large']).optional(),
    density: z.enum(['compact', 'normal', 'large']).optional(),
    height: z.enum(['normal', 'tall']).optional(),
    maxWidth: z.enum(['normal', 'wide']).optional(),
    width: z.enum(['normal', 'wide']).optional(),
    columnsLayout: z.union([z.literal(2), z.literal(3)]).optional()
  })
  .passthrough()
  .optional();

const sectionColumnSchema = z.object({
  id: z.string().min(1),
  blocks: z.array(pageBlockSchema).default([])
});

const sectionSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['hero', 'normal']).optional(),
  columns: z.number().int().min(1).max(3),
  columnsLayout: z.union([z.literal(2), z.literal(3)]).optional(),
  cols: z.array(sectionColumnSchema).min(1).max(3),
  settings: sectionSettingsSchema
});

const pageLayoutSchemaV2 = z.object({
  version: z.literal(2),
  sections: z.array(sectionSchema).default([])
});

export const pageLayoutSchema = z.union([pageLayoutSchemaV1, pageLayoutSchemaV2]);

export type TextBlockData = {
  contentHtml: string;
  width?: 'normal' | 'wide';
  background?: 'none' | 'soft';
};

export type ImageBlockData = {
  mediaId?: string | null;
  src: string;
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
  size: (typeof allowedImageSizes)[number];
  align: (typeof allowedImageAligns)[number];
  cropRatio?: '16:9' | '9:16' | '1:1' | '4:3' | 'free' | null;
  naturalWidth?: number | null;
  naturalHeight?: number | null;
  cropX?: number | null;
  cropY?: number | null;
  cropWidth?: number | null;
  cropHeight?: number | null;
  heightPct?: number | null;
};

export type ButtonBlockData = {
  label: string;
  href: string;
  linkMode?: 'page' | 'manual' | null;
  pageKey?: string | null;
  pageId?: string | null;
  slug?: string | null;
  newTab?: boolean;
  variant?: (typeof allowedButtonVariants)[number];
  icon?: string | null;
};

export type CardItem = {
  id: string;
  icon?: string | null;
  iconType?: 'emoji' | 'image' | null;
  iconImageUrl?: string | null;
  iconImageId?: string | null;
  iconAlt?: string | null;
  title: string;
  text: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};

export type CardBlockData = {
  title?: string | null;
  subtitle?: string | null;
  items: CardItem[];
  layout: 'auto' | '2' | '3' | '4';
  variant: 'feature' | 'simple' | 'borderless';
  borderColorMode?: 'default' | 'custom';
  borderColor?: string | null;
  cardColorMode?: 'default' | 'custom';
  cardColor?: string | null;
  textColorMode?: 'light' | 'dark' | 'custom';
  titleColor?: string | null;
  textColor?: string | null;
};

export type FormField = {
  id: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  label: string;
  placeholder?: string | null;
  required: boolean;
  options?: string[] | null;
};

export type FormBlockData = {
  title?: string | null;
  description?: string | null;
  fields: FormField[];
  submitLabel?: string;
  successMessage?: string;
  storeSummaryKeys?: string[];
  layout?: '1' | '2';
};

export type ButtonGroupBlockData = {
  buttons: Array<{
    id?: string;
    label: string;
    href: string;
    variant?: 'primary' | 'secondary' | 'ghost';
    linkMode?: 'page' | 'manual' | null;
    pageKey?: string | null;
    pageId?: string | null;
    slug?: string | null;
    newTab?: boolean;
  }>;
  align?: 'start' | 'center' | 'end';
  stackOnMobile?: boolean;
};

export type PillItem = {
  text: string;
  href?: string | null;
  linkMode?: 'manual' | 'article' | null;
  articleSlug?: string | null;
};

export type PillsBlockData = {
  pills: (string | PillItem)[];
  items?: string[]; // Legacy support
  size?: 'xs' | 'sm' | 'md';
  variant?: 'neutral' | 'primary' | 'accent';
};

export type SpanBlockData = {
  kind?: 'accent-bar' | 'muted-text' | 'floating-badge' | 'eyebrow' | 'divider' | 'spacer';
  text?: string | null;
  icon?: string | null;
};

export type RecentPostsBlockData = {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaLinkMode?: 'page' | 'manual';
  ctaPageKey?: string | null;
  ctaPageId?: string | null;
  ctaSlug?: string | null;
  postsLimit?: number;
};

export type SocialLinksBlockData = {
  title?: string | null;
  variant?: 'list' | 'chips' | 'buttons';
  showIcons?: boolean;
  columns?: 1 | 2 | 3;
  align?: 'left' | 'center' | 'right';
};

export type WhatsAppCtaBlockData = {
  label?: string;
  style?: 'primary' | 'secondary';
  openInNewTab?: boolean;
  hideWhenDisabled?: boolean;
};

export type ContactInfoBlockData = {
  titleHtml: string;
  descriptionHtml?: string;
  whatsappLabel: string;
  whatsappVariant: 'primary' | 'secondary' | 'tertiary' | 'badge';
  socialLinksTitle: string;
  socialLinksVariant: 'list' | 'icons';
};

export type ServicesBlockItem = {
  id: string;
  title: string;
  description?: string;
  href: string;
  linkMode?: 'page' | 'manual' | null;
  pageId?: string | null;
  pageKey?: string | null;
  slug?: string | null;
  iconImageId?: string | null;
  iconImageUrl?: string | null;
  iconAlt?: string | null;
};

export type ServicesBlockData = {
  sectionTitle: string;
  items: ServicesBlockItem[];
  buttonLabel?: string;
  textColorMode?: 'default' | 'custom';
  textColor?: string | null;
  buttonColorMode?: 'default' | 'custom';
  buttonColor?: string | null;
  iconImageId?: string | null;
  iconImageUrl?: string | null;
  iconAlt?: string | null;
};

export type CtaBlockData = {
  title?: string | null;
  text?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ctaLinkMode?: 'page' | 'manual' | null;
  ctaPageKey?: string | null;
  ctaPageId?: string | null;
  ctaSlug?: string | null;
  imageId?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageSide?: 'left' | 'right';
  imageDissolve?: boolean;
  imageDissolveStrength?: 'soft' | 'medium' | 'strong';
};

export type MediaTextBlockData = {
  contentHtml: string;
  imageId?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageSide?: 'left' | 'right';
  imageWidth?: 25 | 50 | 75 | 100;
  imageHeight?: 25 | 50 | 75 | 100;
  customImageWidthPct?: number | null;
};

export type PageBlock =
  | {
      id: string;
      type: 'text';
      rowIndex?: number;
      colSpan?: number;
      createdAt: string;
      updatedAt: string;
      data: TextBlockData;
      isLocked?: boolean;
      visible?: boolean;
    }
  | {
      id: string;
      type: 'image';
      rowIndex?: number;
      colSpan?: number;
      createdAt: string;
      updatedAt: string;
      data: ImageBlockData;
      isLocked?: boolean;
      visible?: boolean;
    }
  | {
      id: string;
      type: 'button';
      rowIndex?: number;
      colSpan?: number;
      createdAt: string;
      updatedAt: string;
      data: ButtonBlockData;
      isLocked?: boolean;
      visible?: boolean;
    }
  | {
      id: string;
      type: 'cards';
      rowIndex?: number;
      colSpan?: number;
      createdAt: string;
      updatedAt: string;
      data: CardBlockData;
      isLocked?: boolean;
      visible?: boolean;
    }
  | {
      id: string;
      type: 'buttonGroup';
      rowIndex?: number;
      colSpan?: number;
      createdAt: string;
      updatedAt: string;
      data: ButtonGroupBlockData;
      isLocked?: boolean;
      visible?: boolean;
    }
  | {
      id: string;
      type: 'pills';
      rowIndex?: number;
      colSpan?: number;
      createdAt: string;
      updatedAt: string;
      data: PillsBlockData;
      isLocked?: boolean;
      visible?: boolean;
    }
  | {
      id: string;
      type: 'span';
      rowIndex?: number;
      colSpan?: number;
      createdAt: string;
      updatedAt: string;
      data: SpanBlockData;
      isLocked?: boolean;
      visible?: boolean;
    }
  | {
      id: string;
      type: 'recent-posts';
      rowIndex?: number;
      colSpan?: number;
      createdAt: string;
      updatedAt: string;
      data: RecentPostsBlockData;
      isLocked?: boolean;
      visible?: boolean;
    }
  | {
      id: string;
      type: 'form';
      rowIndex?: number;
      colSpan?: number;
      createdAt: string;
      updatedAt: string;
      data: FormBlockData;
      isLocked?: boolean;
      visible?: boolean;
    }
  | {
      id: string;
      type: 'hero';
      rowIndex?: number;
      colSpan?: number;
      createdAt: string;
      updatedAt: string;
      data: HeroBlockData;
      isLocked?: boolean;
      visible?: boolean;
    }
  | {
      id: string;
      type: 'social-links';
      rowIndex?: number;
      colSpan?: number;
      createdAt: string;
      updatedAt: string;
      data: SocialLinksBlockData;
      isLocked?: boolean;
      visible?: boolean;
    }
  | {
      id: string;
      type: 'whatsapp-cta';
      rowIndex?: number;
      colSpan?: number;
      createdAt: string;
      updatedAt: string;
      data: WhatsAppCtaBlockData;
      isLocked?: boolean;
      visible?: boolean;
    }
  | {
      id: string;
      type: 'contact-info';
      rowIndex?: number;
      colSpan?: number;
      createdAt: string;
      updatedAt: string;
      data: ContactInfoBlockData;
      isLocked?: boolean;
      visible?: boolean;
    }
  | {
      id: string;
      type: 'services';
      rowIndex?: number;
      colSpan?: number;
      createdAt: string;
      updatedAt: string;
      data: ServicesBlockData;
      isLocked?: boolean;
      visible?: boolean;
    }
  | {
      id: string;
      type: 'cta';
      rowIndex?: number;
      colSpan?: number;
      createdAt: string;
      updatedAt: string;
      data: CtaBlockData;
      isLocked?: boolean;
      visible?: boolean;
    }
  | {
      id: string;
      type: 'media-text';
      rowIndex?: number;
      colSpan?: number;
      createdAt: string;
      updatedAt: string;
      data: MediaTextBlockData;
      isLocked?: boolean;
      visible?: boolean;
    }
  | {
      id: string;
      type: 'faq';
      rowIndex?: number;
      colSpan?: number;
      createdAt: string;
      updatedAt: string;
      data: FaqBlockData;
      isLocked?: boolean;
      visible?: boolean;
    };

// V1 Layout (legacy, column-based)
export type PageLayoutV1 = {
  version: 1;
  columns: 1 | 2 | 3;
  cols: Array<{ id?: string; blocks: PageBlock[] }>;
};

// V2 Layout (section-based)
export type PageSection = {
  id: string;
  columns: 1 | 2 | 3;
  columnsLayout?: 2 | 3;
  cols: Array<{ id: string; blocks: PageBlock[] }>;
  kind?: string;
  settings?: {
    background?: 'none' | 'soft' | 'dark' | 'earthy';
    backgroundStyle?: 'none' | 'soft' | 'dark' | 'earthy';
    padding?: 'normal' | 'compact' | 'large';
    density?: 'normal' | 'compact' | 'large';
    maxWidth?: 'normal' | 'wide';
    width?: 'normal' | 'wide';
    columnsLayout?: 2 | 3;
  };
};

export type PageLayoutV2 = {
  version: 2;
  sections: PageSection[];
};

export type PageLayout = PageLayoutV1 | PageLayoutV2;

/**
 * Migrates a V1 layout to V2 by wrapping columns into a single section
 */
function migrateLayoutV1toV2(layoutV1: PageLayoutV1): PageLayoutV2 {
  const columns = clampColumns(layoutV1.columns ?? 1);
  const cols = Array.from({ length: columns }, (_v, index) => ({
    id: layoutV1.cols[index]?.id ?? `col-${index + 1}`,
    blocks: layoutV1.cols[index]?.blocks ?? []
  }));

  // Migrate blocks from extra columns to the last visible column
  layoutV1.cols.slice(columns).forEach((col) => {
    cols[columns - 1].blocks = [...cols[columns - 1].blocks, ...(col.blocks ?? [])];
  });

  return {
    version: 2,
    sections: [
      {
        id: randomUUID(),
        columns: columns as 1 | 2 | 3,
        cols,
        settings: {}
      }
    ]
  };
}

/**
 * Normalizes a page layout to V2 format
 */
export function normalizePageLayout(layout: unknown): PageLayoutV2 {
  const parsed = pageLayoutSchema.parse(layout ?? { version: 2, sections: [] });
  const now = new Date().toISOString();

  // If it's V1, migrate to V2
  if (parsed.version === 1) {
    const migrated = migrateLayoutV1toV2(parsed as PageLayoutV1);
    return normalizeLayoutV2(migrated, now);
  }

  // It's already V2
  return normalizeLayoutV2(parsed as PageLayoutV2, now);
}

function normalizeLayoutV2(layout: PageLayoutV2, now: string): PageLayoutV2 {
  const sections = (layout.sections ?? []).map((section) => {
    const desiredColumns = section.settings?.columnsLayout ?? section.columnsLayout ?? section.columns ?? 2;
    const columns = clampColumns(desiredColumns);
    const cols: Array<{ id: string; blocks: PageBlock[] }> = Array.from({ length: columns }, (_v, index) => ({
      id: section.cols[index]?.id ?? `col-${index + 1}`,
      blocks: []
    }));

    section.cols.forEach((col, index) => {
      const targetIndex = Math.min(index, columns - 1);
      const target = cols[targetIndex];
      const normalizedBlocks = (col?.blocks ?? [])
        .map((block) => normalizeBlock(block, now))
        .filter(Boolean) as PageBlock[];
      target.blocks.push(...normalizedBlocks);
    });

    return {
      id: section.id ?? randomUUID(),
      columns: columns as 1 | 2 | 3,
      columnsLayout: columns >= 2 ? (columns as 2 | 3) : undefined,
      cols,
      settings: {
        ...section.settings,
        backgroundStyle: section.settings?.backgroundStyle ?? section.settings?.background,
        density: section.settings?.density ?? section.settings?.padding,
        width: section.settings?.width ?? section.settings?.maxWidth,
        columnsLayout: section.settings?.columnsLayout ?? (columns >= 2 ? (columns as 2 | 3) : undefined)
      }
    } as PageSection;
  });

  return {
    version: 2,
    sections
  };
}

/**
 * Ensures the layout always contains a hero block locked at the very top (first block of the first column)
 * and removes duplicate hero blocks.
 */
export function ensureHeroAtTop(layout: PageLayoutV2, now = new Date().toISOString()): PageLayoutV2 {
  const copy: PageLayoutV2 = JSON.parse(JSON.stringify(layout));
  let heroBlock: PageBlock | null = null;

  copy.sections = (copy.sections || []).map((section) => ({
    ...section,
    cols: section.cols.map((col) => {
      const blocks = [...col.blocks];
      const heroIndex = blocks.findIndex((b) => b.type === 'hero');
      if (heroIndex >= 0) {
        if (!heroBlock) {
          const candidate = blocks[heroIndex];

          if (candidate.type === 'hero') {
            heroBlock = {
              ...candidate,
              id: candidate.id || randomUUID(),
              createdAt: isIsoDate(candidate.createdAt) ? candidate.createdAt! : now,
              updatedAt: now,
              isLocked: true,
              visible: candidate.visible ?? true,
              data: {
                ...candidate.data
              }
            };
          }
        }
        blocks.splice(heroIndex, 1);
      }
      return { ...col, blocks };
    })
  }));

  // Create hero block if missing
  if (!heroBlock) {
    heroBlock = {
      id: randomUUID(),
      type: 'hero',
      createdAt: now,
      updatedAt: now,
      isLocked: true,
      visible: true,
      colSpan: 999,
      data: {
        version: 2,
        layout: 'two-col',
        layoutVariant: 'split',
        imageHeight: 'lg',
        left: [
          {
            id: randomUUID(),
            type: 'text',
            createdAt: now,
            updatedAt: now,
            isLocked: false,
            visible: true,
            colSpan: 1,
            data: {
              contentHtml: '<h1>[Título de impacto sobre o seu negócio]</h1>',
              width: 'normal',
              background: 'none'
            }
          },
          {
            id: randomUUID(),
            type: 'text',
            createdAt: now,
            updatedAt: now,
            isLocked: false,
            visible: true,
            colSpan: 1,
            data: {
              contentHtml: '<p>[Descreva em 1-2 frases o que você oferece e para quem]</p>',
              width: 'normal',
              background: 'none'
            }
          }
        ],
        right: [
          {
            id: randomUUID(),
            type: 'image',
            createdAt: now,
            updatedAt: now,
            isLocked: false,
            visible: true,
            colSpan: 1,
            data: {
              mediaId: null,
              src: 'https://via.placeholder.com/600x400?text=Adicione+uma+imagem',
              alt: 'Hero image',
              title: null,
              caption: null,
              size: 100,
              align: 'center',
              heightPct: 100
            }
          }
        ],
        rightVariant: 'image-only'
      }
    };
  }

  // Ensure at least one section/column exists
  if (!copy.sections.length) {
    copy.sections = [
      {
        id: randomUUID(),
        columns: 1,
        cols: [{ id: 'col-1', blocks: [] }],
        settings: {}
      }
    ];
  }

  const firstSection = copy.sections[0];
  const columns = clampColumns(firstSection.columns ?? 1);
  const cols: Array<{ id: string; blocks: PageBlock[] }> = Array.from({ length: columns }, (_v, index) => ({
    id: firstSection.cols[index]?.id ?? `col-${index + 1}`,
    blocks: firstSection.cols[index]?.blocks ?? []
  }));
  firstSection.columns = columns as 1 | 2 | 3;
  firstSection.cols = cols;

  // Place hero at the very top of the first column
  const [firstCol, ...rest] = firstSection.cols;
  firstSection.cols = [{ ...firstCol, blocks: [heroBlock!, ...firstCol.blocks] }, ...rest];

  return copy;
}

function normalizeBlock(block: unknown, now: string): PageBlock | null {
  const parsed = pageBlockSchema.safeParse(block);
  if (!parsed.success) return null;
  const base = parsed.data;
  const createdAt = isIsoDate(base.createdAt) ? base.createdAt! : now;
  const isLocked = base.isLocked ?? base.type === 'hero';
  const visible = base.visible ?? true;
  const colSpan = Math.max(1, Math.min(base.colSpan ?? 1, 3));
  const rawRowIndex = base.rowIndex;
  const rowIndex =
    Number.isInteger(rawRowIndex) && Number(rawRowIndex) >= 0 ? Number(rawRowIndex) : undefined;
  const common = {
    id: base.id || randomUUID(),
    createdAt,
    updatedAt: now,
    isLocked,
    visible,
    colSpan,
    rowIndex
  };

  switch (base.type) {
    case 'text':
      return {
        ...common,
        type: 'text',
        data: {
          contentHtml: sanitizeContent(base.data.contentHtml || ''),
          width: base.data.width ?? 'normal',
          background: base.data.background ?? 'none'
        }
      };
    case 'image': {
      const size = allowedImageSizes.includes((base.data.size ?? 100) as (typeof allowedImageSizes)[number])
        ? ((base.data.size ?? 100) as (typeof allowedImageSizes)[number])
        : 100;
      const align = allowedImageAligns.includes((base.data.align ?? 'center') as (typeof allowedImageAligns)[number])
        ? ((base.data.align ?? 'center') as (typeof allowedImageAligns)[number])
        : 'center';
      const src = base.data.src.trim();
      if (!isHttpUrl(src)) throw new HttpError(400, 'Imagem precisa usar uma URL http(s) segura.');

      return {
        ...common,
        type: 'image' as const,
        data: {
          mediaId: base.data.mediaId ?? null,
          src,
          alt: base.data.alt ?? '',
          title: base.data.title ?? null,
          caption: base.data.caption ?? null,
          size,
          align,
          // Preserve crop and height fields
          cropRatio: base.data.cropRatio ?? null,
          naturalWidth: base.data.naturalWidth ?? null,
          naturalHeight: base.data.naturalHeight ?? null,
          cropX: base.data.cropX ?? null,
          cropY: base.data.cropY ?? null,
          cropWidth: base.data.cropWidth ?? null,
          cropHeight: base.data.cropHeight ?? null,
          heightPct: base.data.heightPct ?? null
        }
      };
    }
    case 'button': {
      const href = normalizeHref(base.data.href);
      if (!href) throw new HttpError(400, 'Informe uma URL v\u00e1lida (http/https).');
      return {
        ...common,
        type: 'button',
        data: {
          label: base.data.label.trim(),
          href,
          linkMode: base.data.linkMode ?? null,
          pageKey: base.data.pageKey ?? null,
          pageId: base.data.pageId ?? null,
          slug: base.data.slug ?? null,
          newTab: base.data.newTab ?? false,
          variant: base.data.variant ?? 'primary',
          icon: base.data.icon ?? null
        }
      };
    }
    case 'buttonGroup': {
      const buttons = base.data.buttons.map((btn) => ({
        id: btn.id || randomUUID(),
        label: btn.label.trim(),
        href: normalizeHref(btn.href),
        variant: btn.variant ?? 'primary',
        linkMode: btn.linkMode ?? null,
        pageKey: btn.pageKey ?? null,
        pageId: btn.pageId ?? null,
        slug: btn.slug ?? null,
        newTab: btn.newTab ?? false,
        icon: btn.icon ?? null
      }));
      return {
        ...common,
        type: 'buttonGroup',
        data: {
          buttons,
          align: base.data.align ?? 'start',
          stackOnMobile: base.data.stackOnMobile ?? true
        }
      };
    }
    case 'pills': {
      // Support both 'pills' and legacy 'items' field
      const pillsArray = base.data.pills || base.data.items || [];
      return {
        ...common,
        type: 'pills',
        data: {
          pills: pillsArray,
          size: base.data.size ?? 'sm',
          variant: base.data.variant ?? 'neutral'
        }
      };
    }
    case 'span': {
      const kind = base.data.kind ?? 'accent-bar';
      const hasText = kind === 'muted-text' || kind === 'floating-badge' || kind === 'eyebrow';
      return {
        ...common,
        type: 'span',
        data: {
          kind,
          text: hasText ? (base.data.text?.trim() || null) : null,
          icon: kind === 'floating-badge' ? (base.data.icon?.trim() || null) : null
        }
      };
    }
    case 'recent-posts': {
      const ctaHref = normalizeHref(base.data.ctaHref || '/blog');
      return {
        ...common,
        type: 'recent-posts',
        data: {
          title: base.data.title?.trim() || 'Conteúdos recentes',
          subtitle: base.data.subtitle?.trim() || 'Leituras curtas para acompanhar você entre as sessões.',
          ctaLabel: base.data.ctaLabel?.trim() || 'Ver todos os artigos',
          ctaHref,
          ctaLinkMode: base.data.ctaLinkMode ?? 'page',
          ctaPageKey: base.data.ctaPageKey ?? null,
          ctaPageId: base.data.ctaPageId ?? null,
          ctaSlug: base.data.ctaSlug ?? null,
          postsLimit: base.data.postsLimit ?? 3
        }
      };
    }
    case 'cards': {
      const items = base.data.items.map((item) => {
        const ctaHref = item.ctaHref ? normalizeHref(item.ctaHref) : null;
        const iconType: 'emoji' | 'image' = item.iconType === 'image' ? 'image' : 'emoji';
        const iconImageUrlRaw = item.iconImageUrl ? item.iconImageUrl.toString().trim() : '';
        const iconImageUrl = iconImageUrlRaw ? (normalizeInternalHref(iconImageUrlRaw) || iconImageUrlRaw) : null;
        return {
          id: item.id || randomUUID(),
          icon: item.icon ?? null,
          iconType,
          iconImageUrl,
          iconImageId: item.iconImageId ?? null,
          iconAlt: item.iconAlt?.trim() || null,
          title: item.title.trim(),
          text: item.text.trim(),
          ctaLabel: item.ctaLabel?.trim() || null,
          ctaHref
        };
      });
      const borderColorMode = base.data.borderColorMode ?? 'default';
      const cardColorMode = base.data.cardColorMode ?? 'default';
      const textColorMode = base.data.textColorMode ?? 'dark';
      return {
        ...common,
        type: 'cards',
        data: {
          title: base.data.title?.trim() || null,
          subtitle: base.data.subtitle?.trim() || null,
          items,
          layout: base.data.layout ?? 'auto',
          variant: base.data.variant === 'earthy' ? 'feature' : (base.data.variant ?? 'feature'),
          borderColorMode,
          borderColor: borderColorMode === 'custom' ? (base.data.borderColor?.trim() || null) : null,
          cardColorMode,
          cardColor: cardColorMode === 'custom' ? (base.data.cardColor?.trim() || null) : null,
          textColorMode,
          titleColor: textColorMode === 'custom' ? (base.data.titleColor?.trim() || null) : null,
          textColor: textColorMode === 'custom' ? (base.data.textColor?.trim() || null) : null
        }
      };
    }
    case 'form': {
      const fields = base.data.fields.map((field) => ({
        id: field.id || randomUUID(),
        type: field.type,
        label: field.label.trim(),
        placeholder: field.placeholder?.trim() || null,
        required: field.required ?? false,
        options: field.type === 'select' ? (field.options ?? []) : null
      }));
      return {
        ...common,
        type: 'form',
        data: {
          title: base.data.title?.trim() || null,
          description: base.data.description?.trim() || null,
          fields,
          submitLabel: base.data.submitLabel?.trim() || 'Enviar',
          successMessage: base.data.successMessage?.trim() || 'Formulário enviado com sucesso!',
          storeSummaryKeys: base.data.storeSummaryKeys ?? [],
          layout: base.data.layout === '2' ? '2' : '1'
        }
      };
    }
    case 'hero': {
      const data = base.data;
      
      // Detectar Hero V2 e preservar estrutura
      if ('version' in data && data.version === 2) {
        // Hero V2: preservar rightVariant e blocos nested
        const heroV2 = data;
        const layoutVariant = heroV2.layoutVariant === 'stacked' ? 'stacked' : 'split';
        const leftBlocks = Array.isArray(heroV2.left)
          ? heroV2.left.map((b) => normalizeBlock(b, now)).filter(Boolean) as PageBlock[]
          : [];
        let rightBlocks = Array.isArray(heroV2.right)
          ? heroV2.right.map((b) => normalizeBlock(b, now)).filter(Boolean) as PageBlock[]
          : [];
        let rightVariant = heroV2.rightVariant ?? 'cards-only';

        if (layoutVariant === 'stacked') {
          rightVariant = 'image-only';
          rightBlocks = rightBlocks.filter((b) => b.type === 'image').slice(0, 1);
        }

        const imageHeight = normalizeHeroImageHeight(heroV2.imageHeight, rightBlocks);
        return {
          ...common,
          isLocked: true,
          type: 'hero',
          data: {
            version: 2,
            layout: heroV2.layout ?? 'two-col',
            layoutVariant,
            imageHeight,
            left: leftBlocks,
            right: rightBlocks,
            rightVariant
          }
        };
      }
      
      // Hero V1 (legado)
      const rawMode = (data.mediaMode ?? 'four_cards') as string;
      const normalizedMode: HeroMediaMode =
        rawMode === 'single_card'
          ? 'cards_only'
          : allowedHeroMediaModes.includes(rawMode as HeroMediaMode)
            ? (rawMode as HeroMediaMode)
            : 'four_cards';

      const normalizeImage = (image?: HeroImage | null): HeroImage | null => {
        if (!image) return null;
        const url = image.url?.toString().trim() || null;
        const imageId = image.imageId?.toString().trim() || null;
        const alt = image.alt?.toString().trim() || '';
        const focal = image.focal
          ? {
              x: Number(image.focal.x) || 0,
              y: Number(image.focal.y) || 0,
              zoom: Number(image.focal.zoom) || 1
            }
          : null;
        return { imageId, url, alt, focal };
      };

      type LooseHeroCard = {
        title?: string | null;
        text?: string | null;
        icon?: string | null;
        imageId?: string | null;
        url?: string | null;
        alt?: string | null;
      };
      const normalizeCard = (card?: LooseHeroCard | null, fallbackTitle = '', fallbackText = ''): HeroCard => ({
        title: card?.title?.toString().trim() || fallbackTitle,
        text: card?.text?.toString().trim() || fallbackText,
        icon: card?.icon?.toString().trim() || null,
        imageId: card?.imageId?.toString().trim() || null,
        url: card?.url?.toString().trim() || null,
        alt: card?.alt?.toString().trim() || null
      });

      const defaultSmall: HeroCard[] = [
        { title: 'Equilíbrio emocional', text: 'Ferramentas práticas para o dia a dia.', icon: null, imageId: null, url: null, alt: null },
        { title: 'Relações saudáveis', text: 'Comunicação e limites claros.', icon: null, imageId: null, url: null, alt: null },
        { title: 'Autoconhecimento', text: 'Reconectar-se com quem você é.', icon: null, imageId: null, url: null, alt: null }
      ];

      const fourCardsSource = data.fourCards;
      const fallbackMediumFromSingle =
        data.singleCard && rawMode === 'single_card'
          ? {
              title:
                data.singleCard?.quote?.toString().trim() ||
                'Cada sessão é um espaço seguro para você compreender suas emoções, criar novas rotas e caminhar com leveza.',
              text: data.singleCard?.author?.toString().trim() || 'Texto'
            }
          : null;

      const fourCards: HeroFourCards = {
        medium: normalizeCard(
          fourCardsSource?.medium ?? fallbackMediumFromSingle,
          'Cada sessão é um espaço seguro para você compreender suas emoções, criar novas rotas e caminhar com leveza.',
          'Texto'
        ),
        small: Array.from({ length: 3 }).map((_, idx) =>
          normalizeCard(fourCardsSource?.small?.[idx], defaultSmall[idx].title, defaultSmall[idx].text)
        )
      };

      const singleCard = {
        quote:
          data.singleCard?.quote?.toString().trim() ||
          'Cada sessão é um espaço seguro para você compreender suas emoções, criar novas rotas e caminhar com leveza.',
        author: data.singleCard?.author?.toString().trim() || 'Texto'
      };

      const singleImage = normalizeImage(data.singleImage);

      const normalizedBadges = Array.isArray(data.badges)
        ? data.badges
            .map((badge) => (typeof badge === 'string' ? badge.trim() : ''))
            .filter((badge) => Boolean(badge))
        : [];
      const badges =
        normalizedBadges.length > 0 ? normalizedBadges : ['Diferencial 1', 'Diferencial 2', 'Diferencial 3'];
      return {
        ...common,
        isLocked: true,
        type: 'hero',
        data: {
          heading: data.heading?.toString().trim() || '[Título de impacto sobre o seu negócio]',
          subheading:
            data.subheading?.toString().trim() ||
            '[Descreva em 1-2 frases o que você oferece e para quem]',
          ctaLabel: data.ctaLabel?.toString().trim() || 'Agendar sessão',
          ctaHref: normalizeInternalHref(data.ctaHref?.toString() || '/contato') || '/contato',
          ctaLinkMode: data.ctaLinkMode ?? null,
          ctaPageKey: data.ctaPageKey ?? null,
          ctaPageId: data.ctaPageId ?? null,
          ctaSlug: data.ctaSlug ?? null,
          secondaryCta: data.secondaryCta?.toString().trim() || 'Conhecer a abordagem',
          secondaryHref: normalizeInternalHref(data.secondaryHref?.toString() || '/sobre') || '/sobre',
          secondaryLinkMode: data.secondaryLinkMode ?? null,
          secondaryPageKey: data.secondaryPageKey ?? null,
          secondaryPageId: data.secondaryPageId ?? null,
          secondarySlug: data.secondarySlug ?? null,
          badges,
          mediaMode: normalizedMode,
          singleImage,
          singleCard,
          fourCards
        }
      };
    }
    case 'social-links': {
      return {
        ...common,
        type: 'social-links',
        data: {
          title: base.data.title?.trim() || null,
          variant: base.data.variant ?? 'list',
          showIcons: base.data.showIcons ?? true,
          columns: base.data.columns ?? 1,
          align: base.data.align ?? 'left'
        }
      };
    }
    case 'whatsapp-cta': {
      return {
        ...common,
        type: 'whatsapp-cta',
        data: {
          label: base.data.label?.trim() || 'Enviar mensagem',
          style: base.data.style ?? 'primary',
          openInNewTab: base.data.openInNewTab ?? true,
          hideWhenDisabled: base.data.hideWhenDisabled ?? false
        }
      };
    }
    case 'contact-info': {
      return {
        ...common,
        type: 'contact-info',
        data: {
          // string vazia é uma escolha explícita de "sem título" — só cai no default quando o
          // campo nunca foi definido (undefined/null), mesmo padrão do bloco 'cta' acima.
          titleHtml: base.data.titleHtml != null ? base.data.titleHtml.trim() : '<h2>Contato</h2>',
          descriptionHtml: base.data.descriptionHtml?.trim(),
          whatsappLabel: base.data.whatsappLabel?.trim() || 'Enviar mensagem',
          whatsappVariant: base.data.whatsappVariant ?? 'primary',
          socialLinksTitle: base.data.socialLinksTitle != null ? base.data.socialLinksTitle.trim() : 'Redes Sociais',
          socialLinksVariant: base.data.socialLinksVariant ?? 'list'
        }
      };
    }
    case 'services': {
      const items = (base.data.items ?? []).map((item) => ({
        id: item.id || randomUUID(),
        title: item.title.trim(),
        description: item.description ? item.description.trim().slice(0, 160) : undefined,
        href: normalizeInternalHref(item.href) || item.href.trim(),
        linkMode: item.linkMode ?? null,
        pageId: item.pageId ?? null,
        pageKey: item.pageKey ?? null,
        slug: item.slug ?? null,
        iconImageId: item.iconImageId ?? null,
        iconImageUrl: item.iconImageUrl ?? null,
        iconAlt: item.iconAlt ?? null
      }));
      const textColorMode = base.data.textColorMode ?? 'default';
      const buttonColorMode = base.data.buttonColorMode ?? 'default';
      return {
        ...common,
        type: 'services',
        data: {
          sectionTitle: base.data.sectionTitle?.trim() || 'Serviços',
          items,
          buttonLabel: base.data.buttonLabel?.trim() || 'Saiba mais',
          textColorMode,
          textColor: textColorMode === 'custom' ? (base.data.textColor?.trim() || null) : null,
          buttonColorMode,
          buttonColor: buttonColorMode === 'custom' ? (base.data.buttonColor?.trim() || null) : null,
          iconImageId: base.data.iconImageId ?? null,
          iconImageUrl: base.data.iconImageUrl ?? null,
          iconAlt: base.data.iconAlt ?? null
        }
      };
    }
    case 'cta': {
      const imageUrlRaw = base.data.imageUrl ? base.data.imageUrl.toString().trim() : '';
      const imageUrl = imageUrlRaw ? normalizeInternalHref(imageUrlRaw) || '' : '';
      return {
        ...common,
        type: 'cta',
        data: {
          title: base.data.title?.toString().trim() || 'Vamos conversar?',
          text: base.data.text?.toString().trim() || 'Agende uma conversa inicial para entender o melhor plano.',
          // string vazia é uma escolha explícita de "sem botão" (banner só com texto) — só cai no
          // default 'Agendar' quando o campo nunca foi definido (undefined/null).
          ctaLabel: base.data.ctaLabel != null ? base.data.ctaLabel.toString().trim() : 'Agendar',
          ctaHref: normalizeInternalHref(base.data.ctaHref?.toString() || '/contato') || '/contato',
          ctaLinkMode: base.data.ctaLinkMode ?? null,
          ctaPageKey: base.data.ctaPageKey ?? null,
          ctaPageId: base.data.ctaPageId ?? null,
          ctaSlug: base.data.ctaSlug ?? null,
          imageId: base.data.imageId ?? null,
          imageUrl: imageUrl || null,
          imageAlt: base.data.imageAlt?.toString() || '',
          imageSide: base.data.imageSide ?? 'right',
          imageDissolve: base.data.imageDissolve ?? true,
          imageDissolveStrength: base.data.imageDissolveStrength ?? 'medium'
        }
      };
    }
    case 'media-text': {
      const imageUrlRaw = base.data.imageUrl ? base.data.imageUrl.toString().trim() : '';
      const imageUrl = imageUrlRaw ? normalizeInternalHref(imageUrlRaw) || '' : '';
      const legacyWidth = Number(base.data.imageWidthPct ?? 50);
      const normalizePreset = (value: unknown, fallback: 25 | 50 | 75 | 100): 25 | 50 | 75 | 100 => {
        const num = Number(value);
        if (num === 25 || num === 50 || num === 75 || num === 100) return num as 25 | 50 | 75 | 100;
        // Legacy migration
        if (num <= 30) return 25;
        if (num <= 60) return 50;
        if (num <= 85) return 75;
        if (num > 85) return 100;
        return fallback;
      };
      const imageWidth = normalizePreset(base.data.imageWidth ?? legacyWidth, 50);
      const imageHeight = normalizePreset(base.data.imageHeight, 75);
      const customImageWidthPctRaw = Number(base.data.customImageWidthPct);
      const customImageWidthPct =
        Number.isFinite(customImageWidthPctRaw) && customImageWidthPctRaw > 0
          ? Math.max(1, Math.min(Math.round(customImageWidthPctRaw), 100))
          : null;
      return {
        ...common,
        type: 'media-text',
        data: {
          contentHtml: sanitizeContent(base.data.contentHtml || ''),
          imageId: base.data.imageId ?? null,
          imageUrl: imageUrl || null,
          imageAlt: base.data.imageAlt?.toString() || '',
          imageSide: base.data.imageSide === 'right' ? 'right' : 'left',
          imageWidth,
          imageHeight,
          customImageWidthPct
        }
      };
    }
    case 'faq': {
      const items = base.data.items.map((item) => ({
        id: item.id || randomUUID(),
        question: item.question.trim(),
        answer: item.answer.trim()
      }));
      return {
        ...common,
        type: 'faq',
        data: {
          title: base.data.title?.trim() || null,
          subtitle: base.data.subtitle?.trim() || null,
          items,
          defaultOpenIndex: typeof base.data.defaultOpenIndex === 'number' ? base.data.defaultOpenIndex : null
        }
      };
    }
    default:
      return null;
  }
}

const normalizeHref = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  if (trimmed.startsWith('/')) return trimmed;
  return '';
};

const normalizeInternalHref = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return '';
};

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const isIsoDate = (value?: string) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const clampColumns = (columns: number) => Math.max(1, Math.min(3, columns));
