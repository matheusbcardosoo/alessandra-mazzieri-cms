import type { Media, SocialLink } from './auth';
import type { Page } from './layout';

export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  publishedAt?: string | null;
  status: 'draft' | 'published';
  isFeatured: boolean;
  views: number;
  createdAt?: string;
  updatedAt?: string;
  coverMediaId?: string | null;
  coverMedia?: Media | null;
  coverImageUrl?: string | null;
  coverAlt?: string | null;
  coverCrop?: Record<string, unknown> | null;
  coverOriginalUrl?: string | null;
};

export type SiteThemePreset = 'neutro' | 'terra-oliva' | 'sereno-azul' | 'salvia' | 'vinho-suave';

export type SiteThemeColors = {
  background: string;
  text: string;
  primary: string;
  accent: string;
};

export type SiteTypography = {
  headingFont: string | null;
  bodyFont: string | null;
};

export type SiteThemeBlogElement = {
  titleColor: string | null;
  subtitleColor: string | null;
  gradientStart: string | null;
  gradientEnd: string | null;
};

export type SiteThemeElements = {
  /** Bloco "Conteúdos recentes" exibido na Home */
  blog: SiteThemeBlogElement;
  /** Página /blog (cabeçalho + "Em destaque" + "Mais vistos" + "Todos os artigos") */
  blogPage: SiteThemeBlogElement;
};

export type SiteTheme = {
  preset: SiteThemePreset;
  colors: SiteThemeColors;
  typography?: SiteTypography;
  elements?: SiteThemeElements;
};

export type SiteAddress = {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
};

export type OfficeHour = {
  label: string;
  hours: string;
};

export type SiteSettings = {
  siteName: string;
  cnpj?: string | null;
  professionalRegistration?: string | null;
  contactEmail?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  address?: SiteAddress | null;
  officeHours?: OfficeHour[] | null;
  socials: SocialLink[];
  whatsappEnabled?: boolean | null;
  whatsappLink?: string | null;
  whatsappMessage?: string | null;
  whatsappPosition?: 'right' | 'left' | null;
  hideScheduleCta?: boolean | null;
  brandTagline?: string | null;
  theme?: SiteTheme | null;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
  gaId?: string | null;
  gscVerification?: string | null;
};

export type FormSubmission = {
  id: string;
  pageId: string;
  formBlockId: string;
  data: Record<string, unknown>;
  summary?: Record<string, unknown> | null;
  userAgent?: string | null;
  ip?: string | null;
  createdAt: string;
  updatedAt: string;
  page?: Page;
};

export const BLOG_SECTION_TYPES = ['featured', 'mostViewed', 'allArticles'] as const;
export type BlogSectionType = (typeof BLOG_SECTION_TYPES)[number];

export type BlogSection = {
  type: BlogSectionType;
  visible: boolean;
  title: string;
  subtitle: string;
};

export type BlogAdminConfig = {
  id: string;
  title: string;
  description: string;
  sections: BlogSection[];
};
