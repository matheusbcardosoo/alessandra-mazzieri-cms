import { getBlockImageCropStyles } from '@/utils/imageCrop';
import { OptimizedImage } from '@/components/OptimizedImage';
import type { BlockRendererProps } from '../_shared/types';
import type { ImageBlockData } from './schema';

export function ImageRenderer({ data }: BlockRendererProps<ImageBlockData>) {
  const size = data.size ?? 100;
  const align = data.align ?? 'center';
  const hasCrop = ['cropX', 'cropY', 'cropWidth', 'cropHeight'].every(
    (key) => (data as Record<string, unknown>)[key] !== null && (data as Record<string, unknown>)[key] !== undefined
  );
  const cropStyles = hasCrop
    ? getBlockImageCropStyles(
        data.naturalWidth ?? undefined,
        data.naturalHeight ?? undefined,
        data.cropX,
        data.cropY,
        data.cropWidth,
        data.cropHeight
      )
    : {};
  const cropRatioClass =
    data.cropRatio === '16:9' ? 'page-public-image--crop-16-9'
    : data.cropRatio === '9:16' ? 'page-public-image--crop-9-16'
    : data.cropRatio === '1:1' ? 'page-public-image--crop-1-1'
    : data.cropRatio === '4:3' ? 'page-public-image--crop-4-3'
    : '';
  const cropClasses = hasCrop ? ['page-public-image--cropped', cropRatioClass].filter(Boolean).join(' ') : '';
  const figureClass = `page-public-image rte-image--size-${size} rte-image--align-${align} ${cropClasses}`.trim();

  return (
    <figure className={figureClass}>
      <OptimizedImage src={data.src} avifSrc={data.avifSrc} alt={data.alt ?? ''} loading="lazy" style={cropStyles} />
      {data.caption && <figcaption className="page-public-image-caption">{data.caption}</figcaption>}
    </figure>
  );
}
