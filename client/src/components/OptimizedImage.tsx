import type { ComponentPropsWithoutRef } from 'react';

type OptimizedImageProps = {
  src: string;
  avifSrc?: string | null;
} & Omit<ComponentPropsWithoutRef<'img'>, 'src'>;

export function OptimizedImage({ src, avifSrc, ...imgProps }: OptimizedImageProps) {
  return (
    <picture>
      {avifSrc && <source type="image/avif" srcSet={avifSrc} />}
      <img src={src} {...imgProps} />
    </picture>
  );
}
