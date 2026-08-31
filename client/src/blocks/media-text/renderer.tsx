import { RichText } from '@/components/RichText';
import { OptimizedImage } from '@/components/OptimizedImage';
import type { BlockRendererProps } from '../_shared/types';
import type { MediaTextBlockData } from './schema';

export function MediaTextRenderer({ data }: BlockRendererProps<MediaTextBlockData>) {
  const side = data.imageSide === 'right' ? 'right' : 'left';
  const rawWidth = (data as Record<string, unknown>).imageWidth ?? (data as Record<string, unknown>).imageWidthPct ?? 50;
  const rawCustomWidthPct = Number((data as Record<string, unknown>).customImageWidthPct);
  const rawCustomWidth = Number((data as Record<string, unknown>).customImageWidthPx);
  const widthPreset: 25 | 50 | 75 | 100 = [25, 50, 75, 100].includes(Number(rawWidth))
    ? (Number(rawWidth) as 25 | 50 | 75 | 100)
    : 50;
  const customWidthPct = Number.isFinite(rawCustomWidthPct) && rawCustomWidthPct > 0
    ? Math.max(1, Math.min(Math.round(rawCustomWidthPct), 100))
    : null;
  const customWidthPx = Number.isFinite(rawCustomWidth) && rawCustomWidth > 0
    ? Math.max(120, Math.min(Math.round(rawCustomWidth), 2000))
    : null;
  const resolvedImageWidth = customWidthPct ? `${customWidthPct}%` : customWidthPx ? `${customWidthPx}px` : `${widthPreset}%`;

  return (
    <div
      className={`page-media-text page-media-text--${side}`}
      style={{ ['--media-text-image-width' as string]: resolvedImageWidth }}
    >
      <figure className="page-media-text-image">
        {data.imageUrl ? (
          <OptimizedImage src={data.imageUrl} avifSrc={data.avifSrc} alt={data.imageAlt ?? ''} loading="lazy" />
        ) : (
          <div className="page-media-text-placeholder">Sem imagem</div>
        )}
      </figure>
      <div className="page-media-text-content">
        <RichText html={data.contentHtml || ''} />
      </div>
    </div>
  );
}
