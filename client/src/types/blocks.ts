import type { BackgroundImageConfig } from './layout';

export type TextBlockData = {
  contentHtml: string;
  width?: 'normal' | 'wide';
  background?: 'none' | 'soft';
};

export type ImageBlockData = {
  mediaId?: string | null;
  src: string;
  avifSrc?: string | null;
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
  size?: 25 | 50 | 75 | 100;
  align?: 'left' | 'center' | 'right';
  cropRatio?: '16:9' | '9:16' | '1:1' | '4:3' | 'free';
  naturalWidth?: number | null;
  naturalHeight?: number | null;
  cropX?: number;
  heightPct?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
};

export type ButtonBlockData = {
  label: string;
  href: string;
  newTab?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: string | null;
  linkMode?: 'page' | 'manual';
  pageKey?: string | null;
  pageId?: string | null;
  slug?: string | null;
};

export type CardItem = {
  id: string;
  icon?: string | null;
  iconType?: 'emoji' | 'image' | null;
  iconImageUrl?: string | null;
  avifSrc?: string | null;
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
  /** Variações da borda: com sombra / sem sombra / sem borda */
  variant: 'feature' | 'simple' | 'borderless';
  /** Cor da borda: 'default' = cor primária do site; 'custom' = cor escolhida */
  borderColorMode?: 'default' | 'custom';
  borderColor?: string | null;
  /** Cor do card: 'default' = fundo padrão; 'custom' = cor escolhida */
  cardColorMode?: 'default' | 'custom';
  cardColor?: string | null;
  /** Cor do texto: 'light' = fundo/destaque; 'dark' = texto/primária; 'custom' = cores escolhidas */
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
  /** Cor do texto (título, descrição e rótulos): 'default' = cor padrão do tema; 'custom' = cor escolhida */
  textColorMode?: 'default' | 'custom';
  textColor?: string | null;
  /** Cor do botão de envio: 'default' = cor primária do tema; 'custom' = cor escolhida */
  buttonColorMode?: 'default' | 'custom';
  buttonColor?: string | null;
};

export type HeroMediaMode = 'single_image' | 'cards_only' | 'four_cards';

export type HeroImage = {
  imageId?: string | null;
  url?: string | null;
  avifSrc?: string | null;
  alt?: string | null;
  focal?: { x: number; y: number; zoom: number } | null;
};

export type HeroCard = {
  title: string;
  text: string;
  icon?: string | null;
  imageId?: string | null;
  url?: string | null;
  avifSrc?: string | null;
  alt?: string | null;
};

export type HeroFourCards = {
  medium: HeroCard;
  small: HeroCard[];
};

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

export type PillItem = {
  text: string;
  href?: string | null;
  linkMode?: 'manual' | 'article' | null;
  articleSlug?: string | null;
};

export type PillsBlockData = {
  pills?: (string | PillItem)[];
  items?: string[];
  size?: 'xs' | 'sm' | 'md';
  variant?: 'neutral' | 'primary' | 'accent';
};

export type SpanBlockData = {
  kind: 'accent-bar' | 'muted-text';
  text?: string | null;
};

export type ButtonGroupButton = {
  id?: string;
  label: string;
  href: string;
  variant: 'primary' | 'secondary';
  linkMode?: 'manual' | 'page';
  pageKey?: string | null;
  pageId?: string | null;
  slug?: string | null;
};

export type ButtonGroupBlockData = {
  buttons: ButtonGroupButton[];
  align?: 'start' | 'center';
  stackOnMobile?: boolean;
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

export type ServicesBlockItem = {
  id: string;
  title: string;
  description?: string;
  href: string;
  linkMode?: 'page' | 'manual';
  pageId?: string | null;
  pageKey?: string | null;
  slug?: string | null;
  /** Ícone próprio do item. Se vazio, usa o ícone padrão do bloco (ou o ícone padrão da marca). */
  iconImageId?: string | null;
  iconImageUrl?: string | null;
  avifSrc?: string | null;
  iconAlt?: string | null;
};

export type ServicesBlockData = {
  sectionTitle: string;
  items: ServicesBlockItem[];
  buttonLabel?: string;
  /** Cor do texto (título e descrição de cada item): 'default' = cor padrão do tema; 'custom' = cor escolhida */
  textColorMode?: 'default' | 'custom';
  textColor?: string | null;
  /** Cor do botão "Saiba mais": 'default' = cor padrão do tema; 'custom' = cor escolhida */
  buttonColorMode?: 'default' | 'custom';
  buttonColor?: string | null;
  /** Ícone padrão usado nos itens que não têm ícone próprio. Se vazio, usa o ícone padrão da marca. */
  iconImageId?: string | null;
  iconImageUrl?: string | null;
  avifSrc?: string | null;
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
  avifSrc?: string | null;
  imageAlt?: string | null;
  /** Lado da imagem no card */
  imageSide?: 'left' | 'right';
  /** Dissolver a imagem no fundo do card (evita corte brusco de tons) */
  imageDissolve?: boolean;
  imageDissolveStrength?: 'soft' | 'medium' | 'strong';
};

export type MediaTextBlockData = {
  contentHtml: string;
  imageId?: string | null;
  imageUrl?: string | null;
  avifSrc?: string | null;
  imageAlt?: string | null;
  imageSide?: 'left' | 'right';
  imageWidth?: 25 | 50 | 75 | 100;
  imageHeight?: 25 | 50 | 75 | 100;
  customImageWidthPct?: number | null;
  customImageHeightPct?: number | null;
  customImageWidthPx?: number | null;
  customImageHeightPx?: number | null;
};

export type ContactInfoBlockData = {
  titleHtml: string;
  descriptionHtml?: string;
  whatsappLabel: string;
  whatsappVariant: 'primary' | 'secondary' | 'tertiary';
  socialLinksTitle: string;
  socialLinksVariant: 'list' | 'icons';
};

export type HeroLayoutVariant = 'split' | 'stacked';
export type HeroImageHeight = 'sm' | 'md' | 'lg' | 'xl' | number;

export type HeroBlockDataV2 = {
  version: 2;
  layout: 'two-col';
  layoutVariant?: HeroLayoutVariant;
  imageHeight?: HeroImageHeight | null;
  left: PageBlock[];
  right: PageBlock[];
  rightVariant: 'image-only' | 'cards-only' | 'cards-with-image';
};

export type HeroBlockData = HeroBlockDataV1 | HeroBlockDataV2;

export type BlockBackground = {
  mode: 'none' | 'color' | 'image';
  color?: string;
  image?: BackgroundImageConfig;
};

export type PageBlock =
  | { id: string; type: 'text';          colSpan?: number; rowIndex?: number; data: TextBlockData;        isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'image';         colSpan?: number; rowIndex?: number; data: ImageBlockData;       isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'button';        colSpan?: number; rowIndex?: number; data: ButtonBlockData;      isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'cards';         colSpan?: number; rowIndex?: number; data: CardBlockData;        isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'form';          colSpan?: number; rowIndex?: number; data: FormBlockData;        isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'hero';          colSpan?: number; rowIndex?: number; data: HeroBlockData;        isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'pills';         colSpan?: number; rowIndex?: number; data: PillsBlockData;       isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'span';          colSpan?: number; rowIndex?: number; data: SpanBlockData;        isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'buttonGroup';   colSpan?: number; rowIndex?: number; data: ButtonGroupBlockData; isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'recent-posts';  colSpan?: number; rowIndex?: number; data: RecentPostsBlockData; isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'social-links';  colSpan?: number; rowIndex?: number; data: SocialLinksBlockData; isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'whatsapp-cta';  colSpan?: number; rowIndex?: number; data: WhatsAppCtaBlockData; isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'contact-info';  colSpan?: number; rowIndex?: number; data: ContactInfoBlockData; isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'services';      colSpan?: number; rowIndex?: number; data: ServicesBlockData;    isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'cta';           colSpan?: number; rowIndex?: number; data: CtaBlockData;         isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'media-text';    colSpan?: number; rowIndex?: number; data: MediaTextBlockData;   isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string };

export type BlockType = PageBlock['type'];
