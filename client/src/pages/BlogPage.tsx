import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { ArticleCard } from '../components/ArticleCard';
import { ArticleCardSkeleton } from '../components/ArticleCardSkeleton';
import { ArticleListItem } from '../components/ArticleListItem';
import { ArticleListItemSkeleton } from '../components/ArticleListItemSkeleton';
import { SeoHead } from '../components/SeoHead';
import { fetchArticles, fetchBlogHome, type BlogHomeData } from '../api/queries';
import type { Article, BlogSection } from '../types';
import type { PaginatedResponse } from '../api/queries';

const PER_PAGE = 6;

const DEFAULT_HEADER = {
  title: 'Jornadas e reflexões',
  description: 'Leituras rápidas, aplicáveis e cuidadosas.'
};

const DEFAULT_ALL_ARTICLES_TEXT = {
  title: 'Todos os artigos',
  subtitle: 'Artigos mais recentes, incluindo destaques e mais vistos.'
};

const DEFAULT_SECTIONS: BlogSection[] = [
  { type: 'featured', visible: true, title: 'Em destaque', subtitle: 'Selecionados para aparecer primeiro no blog.' },
  { type: 'mostViewed', visible: true, title: 'Mais vistos', subtitle: 'O que as leitoras estão consumindo agora.' },
  { type: 'allArticles', visible: true, title: DEFAULT_ALL_ARTICLES_TEXT.title, subtitle: DEFAULT_ALL_ARTICLES_TEXT.subtitle }
];

export function BlogPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [prevSearch, setPrevSearch] = useState(search);
  if (search !== prevSearch) {
    setPrevSearch(search);
    setPage(1);
  }

  // Buscar dados agregados do blog (featured, mostViewed, cabeçalho, seções)
  const { data: blogHome, isPending: isBlogHomePending } = useQuery<BlogHomeData>({
    queryKey: ['blog-home'],
    queryFn: fetchBlogHome
  });

  const featured = blogHome?.featured ?? [];
  const mostViewed = blogHome?.mostViewed ?? [];
  const sections = blogHome?.sections ?? (isBlogHomePending ? DEFAULT_SECTIONS : []);

  const featuredIds = useMemo(() => new Set(featured.map((a) => a.id)), [featured]);
  const mostViewedIds = useMemo(() => new Set(mostViewed.map((a) => a.id)), [mostViewed]);

  // SEMPRE buscar TODOS os artigos (sem excludeIds) para a seção "Todos os artigos"
  const { data: allPosts, isPending: isAllPostsPending } = useQuery<PaginatedResponse<Article>>({
    queryKey: ['articles', 'all-posts', search, page],
    queryFn: () =>
      fetchArticles({
        search: search || undefined,
        page,
        limit: PER_PAGE
      }),
    placeholderData: (prev) => prev
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const totalPages = allPosts?.totalPages ?? 1;
  const isSearching = search.trim().length > 0;
  const allArticlesConfig = sections.find((s) => s.type === 'allArticles');
  const allArticlesTitle = allArticlesConfig?.title || DEFAULT_ALL_ARTICLES_TEXT.title;
  const allArticlesSubtitle = allArticlesConfig?.subtitle || DEFAULT_ALL_ARTICLES_TEXT.subtitle;

  const renderAllArticlesList = (title: string, subtitle: string, key?: string) => (
    <div className="blog-section" key={key}>
      <div className="section-title">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <div className="article-list">
        {isAllPostsPending
          ? Array.from({ length: 6 }).map((_, i) => <ArticleListItemSkeleton key={`skeleton-${i}`} />)
          : allPosts?.items?.map((article) => {
              const badges: string[] = [];
              if (featuredIds.has(article.id)) badges.push('Em destaque');
              if (mostViewedIds.has(article.id)) badges.push('Mais visto');
              return <ArticleListItem key={article.id} article={article} badges={badges.length > 0 ? badges : undefined} />;
            })}
        {!isAllPostsPending && !allPosts?.items?.length && <div className="admin-empty">Nenhum artigo encontrado.</div>}
      </div>
      {allPosts && allPosts.totalPages > 1 && (
        <div className="pagination">
          <button type="button" className="btn btn-outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Anterior
          </button>
          <span className="muted">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );

  const renderSection = (section: BlogSection) => {
    if (section.type === 'featured') {
      return (
        <div className="blog-section" key="featured">
          <div className="section-title">
            <h2>{section.title}</h2>
            <p>{section.subtitle}</p>
          </div>
          {isBlogHomePending ? (
            <div className="article-grid featured-grid">
              {Array.from({ length: 3 }).map((_, i) => (
                <ArticleCardSkeleton key={`skeleton-${i}`} variant="featured" />
              ))}
            </div>
          ) : featured.length > 0 ? (
            <div className="article-grid featured-grid">
              {featured.map((article) => (
                <ArticleCard key={article.id} article={article} variant="featured" badge="Em destaque" />
              ))}
            </div>
          ) : (
            <div className="admin-empty">Nenhum post publicado ainda.</div>
          )}
        </div>
      );
    }

    if (section.type === 'mostViewed') {
      return (
        <div className="blog-section" key="mostViewed">
          <div className="section-title">
            <h2>{section.title}</h2>
            <p>{section.subtitle}</p>
          </div>
          {isBlogHomePending ? (
            <div className="article-grid most-viewed-grid">
              {Array.from({ length: 3 }).map((_, i) => (
                <ArticleCardSkeleton key={`skeleton-${i}`} variant="default" />
              ))}
            </div>
          ) : mostViewed.length > 0 ? (
            <div className="article-grid most-viewed-grid">
              {mostViewed.map((article, index) => (
                <ArticleCard key={article.id} article={article} variant="default" badge={`#${index + 1} Mais visto`} showViews />
              ))}
            </div>
          ) : (
            <div className="admin-empty">Sem dados de visualizações suficientes ainda.</div>
          )}
        </div>
      );
    }

    return renderAllArticlesList(section.title, section.subtitle, 'allArticles');
  };

  return (
    <section className="section-block">
      <div className="container">
        <SeoHead title={blogHome?.title || DEFAULT_HEADER.title} description={blogHome?.description || DEFAULT_HEADER.description} />
        <div className="blog-header">
          <div className="section-title" style={{ marginBottom: 0 }}>
            <h1 style={{ margin: 0 }}>{blogHome?.title || DEFAULT_HEADER.title}</h1>
            <p>{blogHome?.description || DEFAULT_HEADER.description}</p>
          </div>
          <form className="blog-search" onSubmit={handleSearch}>
            <div className="search-shell">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título ou tema"
                aria-label="Buscar por título ou tema"
              />
              <button className="search-button" type="submit" aria-label="Filtrar artigos">
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            </div>
          </form>
        </div>

        <div className="blog-sections">
          {isSearching ? renderAllArticlesList(allArticlesTitle, allArticlesSubtitle) : sections.filter((s) => s.visible).map(renderSection)}
        </div>
      </div>
    </section>
  );
}
