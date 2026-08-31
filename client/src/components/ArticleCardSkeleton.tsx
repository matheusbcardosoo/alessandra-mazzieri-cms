import { COVER_ASPECT } from '../constants';
import { SkeletonShimmer } from './SkeletonShimmer';

type ArticleCardSkeletonProps = {
  variant?: 'default' | 'featured' | 'compact';
};

export function ArticleCardSkeleton({ variant = 'default' }: ArticleCardSkeletonProps) {
  const cardClass = `article-card article-card-${variant}`;

  return (
    <div className={cardClass} style={{ pointerEvents: 'none' }}>
      {/* Imagem de capa */}
      <div className="article-image" style={{ aspectRatio: COVER_ASPECT }}>
        <SkeletonShimmer width="100%" height="100%" radius="0" />
      </div>

      {/* Corpo do card */}
      <div className="article-body">
        {/* Título: 2 linhas */}
        <div style={{ marginBottom: '0.75rem' }}>
          <SkeletonShimmer width="100%" height="18px" radius="4px" style={{ marginBottom: '6px' }} />
          <SkeletonShimmer width="85%" height="18px" radius="4px" />
        </div>

        {/* Excerpt: 3 linhas (ou 1 para compact) */}
        <div style={{ marginBottom: variant === 'featured' ? '0.75rem' : '0.5rem' }}>
          {variant === 'compact' ? (
            <SkeletonShimmer width="90%" height="14px" radius="4px" />
          ) : (
            <>
              <SkeletonShimmer width="100%" height="14px" radius="4px" style={{ marginBottom: '6px' }} />
              <SkeletonShimmer width="100%" height="14px" radius="4px" style={{ marginBottom: '6px' }} />
              <SkeletonShimmer width="75%" height="14px" radius="4px" />
            </>
          )}
        </div>

        {/* Meta (views) - apenas para variant com showViews */}
        {variant !== 'compact' && (
          <div style={{ marginTop: '0.5rem' }}>
            <SkeletonShimmer width="120px" height="14px" radius="4px" />
          </div>
        )}
      </div>
    </div>
  );
}
