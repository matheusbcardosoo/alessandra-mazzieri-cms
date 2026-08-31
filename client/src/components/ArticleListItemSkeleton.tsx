import { SkeletonShimmer } from './SkeletonShimmer';

export function ArticleListItemSkeleton() {
  return (
    <div className="article-list-item" style={{ pointerEvents: 'none' }}>
      <div className="article-list-content">
        <div className="article-list-header">
          {/* Título: 1-2 linhas */}
          <div style={{ marginBottom: '0.5rem', flex: 1 }}>
            <SkeletonShimmer width="100%" height="20px" radius="4px" style={{ marginBottom: '4px' }} />
            <SkeletonShimmer width="70%" height="20px" radius="4px" />
          </div>

          {/* Badge placeholder */}
          <div style={{ marginLeft: 'auto', paddingLeft: '1rem' }}>
            <SkeletonShimmer width="80px" height="24px" radius="12px" />
          </div>
        </div>

        {/* Excerpt: 2 linhas */}
        <div style={{ marginTop: '0.75rem' }}>
          <SkeletonShimmer width="100%" height="14px" radius="4px" style={{ marginBottom: '6px' }} />
          <SkeletonShimmer width="95%" height="14px" radius="4px" />
        </div>
      </div>

      {/* Botão */}
      <div className="article-list-action">
        <SkeletonShimmer width="100px" height="36px" radius="4px" />
      </div>
    </div>
  );
}
