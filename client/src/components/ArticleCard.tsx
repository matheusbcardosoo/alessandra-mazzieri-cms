import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import { COVER_ASPECT } from '../constants';
import type { Article } from '../types';
import { getMediaCropStyles } from '../utils/imageCrop';

type ArticleCardProps = {
  article: Article;
  variant?: 'default' | 'featured' | 'compact';
  badge?: string;
  badges?: string[]; // Array de badges para "Todos os artigos"
  showViews?: boolean;
};

const formatViews = (views?: number) => {
  if (views === undefined || views === null) return null;
  return new Intl.NumberFormat('pt-BR').format(Math.max(0, views));
};

export function ArticleCard({ article, variant = 'default', badge, badges, showViews }: ArticleCardProps) {
  const coverUrl = article.coverImageUrl ?? article.coverMedia?.url;
  const alt = article.coverAlt ?? article.coverMedia?.alt ?? article.title;
  const cardClass = `article-card article-card-${variant}`;

  const cropStyles = article.coverMedia ? getMediaCropStyles(article.coverMedia) : {};
  const viewLabel = formatViews(article.views);

  return (
    <Link to={`/blog/${article.slug}`} className={cardClass}>
      <div className="article-image" style={{ aspectRatio: COVER_ASPECT }}>
        {/* Renderizar badge único (para destaques e mais vistos) */}
        {badge && !badges && <span className="article-chip">{badge}</span>}
        {/* Renderizar múltiplos badges (para "Todos os artigos") */}
        {badges && badges.length > 0 && (
          <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap', zIndex: 10 }}>
            {badges.map((b, i) => {
              // Adicionar classes específicas baseado no texto do badge
              const badgeClass = b === 'Em destaque' 
                ? 'article-chip badge-featured' 
                : b === 'Mais visto' 
                  ? 'article-chip badge-most-viewed'
                  : 'article-chip';
              return (
                <span key={i} className={badgeClass}>{b}</span>
              );
            })}
          </div>
        )}
        {coverUrl ? (
          <img src={coverUrl} alt={alt} loading="lazy" style={cropStyles} />
        ) : (
          <div className="article-placeholder">
            <span role="img" aria-label="Sem imagem">
              [ ]
            </span>
            <small>Sem imagem</small>
          </div>
        )}
        {/* Botão CTA movido para dentro da área da imagem */}
        <span className="article-cta btn btn-primary" role="button">
          Ler artigo
        </span>
      </div>
      <div className="article-body">
        <h3 className="article-title">{article.title}</h3>
        {variant !== 'compact' && <p className="article-excerpt">{article.excerpt}</p>}
        {variant === 'compact' && <p className="article-excerpt compact">{article.excerpt}</p>}
        {showViews && viewLabel && (
          <div className="article-meta">
            <span className="article-views">
              <FontAwesomeIcon icon={faEye} style={{ marginRight: '0.3rem' }} />
              {viewLabel} visualizações
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
