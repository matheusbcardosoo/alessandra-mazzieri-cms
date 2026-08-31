import type { SiteSettings } from '../types';

export type SeoHeadInput = {
  title: string;
  description?: string | null;
  origin: string;
  pathname: string;
  siteSettings?: SiteSettings | null;
  /** JSON-LD adicional específico da página (ex: Article). Mesclado após o WebSite/Organization padrão. */
  extraJsonLd?: Record<string, unknown>[];
  noIndex?: boolean;
};

const FALLBACK_SITE_NAME = 'Meu Site';
const FALLBACK_DESCRIPTION = 'Descreva aqui, em uma frase, o que este site oferece.';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsonForScript(value: unknown): string {
  // Impede que o conteúdo feche a tag <script> prematuramente ou injete
  // outra tag (mesma técnica usada no estado hidratado do React Query).
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function absoluteUrl(origin: string, url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Monta o HTML das tags de <head> (title, description, canonical, OG,
 * Twitter Card e JSON-LD) a partir dos dados já pré-buscados no servidor.
 * Usado tanto em dev (client/dev-server.js) quanto em produção (server.js).
 */
export function buildSeoHead(input: SeoHeadInput): string {
  const siteName = input.siteSettings?.siteName || FALLBACK_SITE_NAME;
  const description = (input.description || input.siteSettings?.metaDescription || FALLBACK_DESCRIPTION).slice(
    0,
    300
  );
  const title = `${input.title} | ${siteName}`;
  const canonicalUrl = `${input.origin}${input.pathname}`;
  const ogImage = absoluteUrl(input.origin, input.siteSettings?.ogImageUrl);

  const tags: string[] = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeHtml(siteName)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`
  ];

  if (ogImage) {
    tags.push(`<meta property="og:image" content="${escapeHtml(ogImage)}" />`);
    tags.push(`<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`);
  }

  if (input.noIndex) {
    tags.push(`<meta name="robots" content="noindex, nofollow" />`);
  }

  const jsonLd = [buildOrganizationJsonLd(input.origin, input.siteSettings), ...(input.extraJsonLd ?? [])].filter(
    Boolean
  );

  if (jsonLd.length) {
    tags.push(`<script type="application/ld+json">${escapeJsonForScript(jsonLd)}</script>`);
  }

  return tags.join('\n    ');
}

function buildOrganizationJsonLd(origin: string, settings?: SiteSettings | null): Record<string, unknown> | null {
  if (!settings) return null;
  const sameAs = (settings.socials ?? [])
    .filter((social) => social.isVisible !== false && social.url)
    .map((social) => social.url);

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.siteName || FALLBACK_SITE_NAME,
    url: origin,
    ...(settings.logoUrl ? { logo: absoluteUrl(origin, settings.logoUrl) } : {}),
    ...(settings.contactEmail ? { email: settings.contactEmail } : {}),
    ...(settings.phone ? { telephone: settings.phone } : {}),
    ...(sameAs.length ? { sameAs } : {})
  };
}

export function buildArticleJsonLd(
  origin: string,
  pathname: string,
  article: { title: string; excerpt?: string | null; publishedAt?: string | null; coverImageUrl?: string | null }
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt ?? undefined,
    url: `${origin}${pathname}`,
    ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
    ...(article.coverImageUrl ? { image: absoluteUrl(origin, article.coverImageUrl) } : {})
  };
}
