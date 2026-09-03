import type { QueryClient } from '@tanstack/react-query';
import { matchPath } from 'react-router-dom';
import {
  fetchArticle,
  fetchBlogHome,
  fetchArticles,
  fetchHomePage,
  fetchNavbar,
  fetchPage,
  fetchSiteSettings
} from '../api/queries';
import { buildArticleJsonLd } from './seo';
import type { SiteSettings } from '../types';

export type RouteSeo = {
  title: string;
  description?: string | null;
  extraJsonLd?: Record<string, unknown>[];
  noIndex?: boolean;
  /** Home's title is written by the admin as the full `<title>` tag already — don't append "| SiteName" again. */
  appendSiteName?: boolean;
};

export type PrefetchResult = {
  statusCode: number;
  seo: RouteSeo;
  siteSettings: SiteSettings | null;
};

const NOT_FOUND_SEO: RouteSeo = { title: 'Página não encontrada', noIndex: true };

/**
 * Pré-busca (via React Query) exatamente os mesmos dados que o componente
 * da rota buscaria no client, usando as mesmas query keys — assim a
 * hidratação não refaz o fetch. Também devolve o título/descrição para
 * montar as meta tags do <head>, já que aqui ainda temos os dados "à mão"
 * sem precisar inspecionar a árvore React renderizada.
 */
export async function prefetchRoute(pathname: string, origin: string, queryClient: QueryClient): Promise<PrefetchResult> {
  const [siteSettings] = await Promise.all([
    queryClient.fetchQuery({ queryKey: ['site-config'], queryFn: fetchSiteSettings }).catch(() => null),
    queryClient.prefetchQuery({ queryKey: ['navbar'], queryFn: fetchNavbar }).catch(() => undefined)
  ]);

  const seo = await prefetchForPath(pathname, origin, queryClient);
  return { statusCode: seo === NOT_FOUND_SEO ? 404 : 200, seo, siteSettings: siteSettings ?? null };
}

async function prefetchForPath(pathname: string, origin: string, queryClient: QueryClient): Promise<RouteSeo> {
  if (pathname === '/') {
    const page = await queryClient
      .fetchQuery({ queryKey: ['home', 'page-builder'], queryFn: fetchHomePage })
      .catch(() => null);
    if (!page) return { title: 'Início' };
    return { title: page.title || 'Início', description: page.description, appendSiteName: false };
  }

  if (pathname === '/sobre' || pathname === '/contato') {
    const slug = pathname.slice(1);
    const page = await queryClient.fetchQuery({ queryKey: ['page', slug], queryFn: () => fetchPage(slug) }).catch(() => null);
    if (!page) return NOT_FOUND_SEO;
    return { title: page.title, description: page.description ?? page.title };
  }

  if (pathname === '/blog') {
    await Promise.all([
      queryClient.prefetchQuery({ queryKey: ['blog-home'], queryFn: fetchBlogHome }),
      queryClient.prefetchQuery({
        queryKey: ['articles', 'all-posts', '', 1],
        queryFn: () => fetchArticles({ page: 1, limit: 6 })
      })
    ]).catch(() => undefined);
    return { title: 'Blog', description: 'Artigos sobre saude emocional e bem-estar.' };
  }

  const articleMatch = matchPath('/blog/:slug', pathname);
  if (articleMatch?.params.slug) {
    const slug = articleMatch.params.slug;
    const article = await queryClient
      .fetchQuery({ queryKey: ['article', slug], queryFn: () => fetchArticle(slug) })
      .catch(() => null);
    if (!article) return NOT_FOUND_SEO;
    return {
      title: article.title,
      description: article.excerpt,
      extraJsonLd: [buildArticleJsonLd(origin, pathname, article)]
    };
  }

  const pageMatch = matchPath('/p/:slug', pathname);
  if (pageMatch?.params.slug) {
    const slug = pageMatch.params.slug;
    if (slug === 'home') return { title: 'Início' };
    const page = await queryClient.fetchQuery({ queryKey: ['page', slug], queryFn: () => fetchPage(slug) }).catch(() => null);
    if (!page) return NOT_FOUND_SEO;
    return { title: page.title, description: page.description ?? page.title };
  }

  // Rotas fora do mapa de conteúdo público (ex: /admin/*) não têm prefetch
  // dedicado — o shell é renderizado do mesmo jeito e o client assume a
  // partir da hidratação.
  return { title: 'Painel administrativo', noIndex: true };
}
