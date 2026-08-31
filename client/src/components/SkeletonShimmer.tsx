import type { CSSProperties } from 'react';
import './SkeletonShimmer.css';

type SkeletonShimmerProps = {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  className?: string;
  style?: CSSProperties;
};

export function SkeletonShimmer({
  width = '100%',
  height = '20px',
  radius = '4px',
  className = '',
  style = {}
}: SkeletonShimmerProps) {
  const defaultStyle: CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: typeof radius === 'number' ? `${radius}px` : radius,
    backgroundColor: '#e5e7eb',
    backgroundImage: 'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 2s infinite',
    ...style
  };

  return <div className={`skeleton-shimmer ${className}`.trim()} style={defaultStyle} />;
}

export function SkeletonLines({ count = 3, width = '100%', lineHeight = '12px', gap = '8px' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonShimmer
          key={i}
          width={i === count - 1 ? '80%' : width}
          height={lineHeight}
          radius="4px"
        />
      ))}
    </div>
  );
}
