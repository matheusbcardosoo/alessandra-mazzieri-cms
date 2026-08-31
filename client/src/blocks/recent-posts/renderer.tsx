import { useQuery } from '@tanstack/react-query';
import { ArticleCard } from '@/components/ArticleCard';
import { fetchArticles } from '@/api/queries';
import type { Article } from '@/types';
import type { PaginatedResponse } from '@/api/queries';
import type { BlockRendererProps } from '../_shared/types';
import type { RecentPostsBlockData } from './schema';

export function RecentPostsRenderer({ data }: BlockRendererProps<RecentPostsBlockData>) {
  const title = data.title ?? 'Conteúdos recentes';
  const subtitle = data.subtitle ?? 'Leituras curtas para acompanhar você entre as sessões.';
  const ctaLabel = data.ctaLabel ?? 'Ver todos os artigos';
  const ctaHref = data.ctaHref ?? '/blog';
  const postsLimit = data.postsLimit ?? 3;

  const { data: articlesResponse, isLoading } = useQuery<PaginatedResponse<Article>>({
    queryKey: ['articles', 'recent-posts', postsLimit],
    queryFn: () => fetchArticles({ limit: postsLimit, page: 1 })
  });

  const articles = articlesResponse?.items ?? [];

  return (
    <div className="recent-posts-section">
      <div className="section-title">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>

      {isLoading && (
        <div className="recent-posts-grid">
          {Array.from({ length: postsLimit }).map((_, idx) => (
            <div key={idx} className="admin-card" style={{ padding: '1.5rem' }}>
              <div className="skeleton" style={{ height: '200px', width: '100%', marginBottom: '1rem', borderRadius: '8px' }} />
              <div className="skeleton" style={{ height: '24px', width: '80%', marginBottom: '0.5rem' }} />
              <div className="skeleton" style={{ height: '16px', width: '100%', marginBottom: '0.5rem' }} />
              <div className="skeleton" style={{ height: '16px', width: '60%' }} />
            </div>
          ))}
        </div>
      )}

      {!isLoading && articles.length > 0 && (
        <div className="recent-posts-grid">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {!isLoading && articles.length === 0 && (
        <div className="admin-empty" style={{ padding: '3rem', textAlign: 'center' }}>
          <p className="muted">Nenhum artigo publicado ainda.</p>
        </div>
      )}

      {articles.length > 0 && (
        <a href={ctaHref} className="btn btn-outline">
          {ctaLabel}
        </a>
      )}
    </div>
  );
}
