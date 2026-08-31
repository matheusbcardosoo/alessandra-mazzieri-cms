import { Link } from 'react-router-dom';
import type { Article } from '../types';

type ArticleListItemProps = {
  article: Article;
  badges?: string[];
};

export function ArticleListItem({ article, badges }: ArticleListItemProps) {
  return (
    <div className="article-list-item">
      <div className="article-list-content">
        <div className="article-list-header">
          <h3 className="article-list-title">{article.title}</h3>
          {badges && badges.length > 0 && (
            <div className="article-list-badges">
              {badges.map((badge, i) => {
                const badgeClass = badge === 'Em destaque' 
                  ? 'article-list-badge badge-featured' 
                  : badge === 'Mais visto' 
                    ? 'article-list-badge badge-most-viewed'
                    : 'article-list-badge';
                return (
                  <span key={i} className={badgeClass}>{badge}</span>
                );
              })}
            </div>
          )}
        </div>
        {article.excerpt && (
          <p className="article-list-excerpt">{article.excerpt}</p>
        )}
      </div>
      <div className="article-list-action">
        <Link 
          to={`/blog/${article.slug}`} 
          className="btn btn-primary btn-sm"
          aria-label={`Ler artigo: ${article.title}`}
        >
          Ler artigo
        </Link>
      </div>
    </div>
  );
}
