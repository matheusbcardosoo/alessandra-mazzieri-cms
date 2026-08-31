import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { OptimizedImage } from './OptimizedImage';

describe('OptimizedImage', () => {
  test('renders a picture with an AVIF source and the fallback img when avifSrc is present', () => {
    const html = renderToString(<OptimizedImage src="/img.webp" avifSrc="/img.avif" alt="Foto" />);

    expect(html).toContain('<picture>');
    expect(html).toContain('<source');
    expect(html).toContain('type="image/avif"');
    expect(html).toContain('srcSet="/img.avif"');
    expect(html).toContain('src="/img.webp"');
    expect(html).toContain('alt="Foto"');
  });

  test('omits the source element when avifSrc is null', () => {
    const html = renderToString(<OptimizedImage src="/img.webp" avifSrc={null} alt="Foto" />);

    expect(html).not.toContain('<source');
    expect(html).toContain('src="/img.webp"');
  });

  test('omits the source element when avifSrc is undefined', () => {
    const html = renderToString(<OptimizedImage src="/img.webp" alt="Foto" />);

    expect(html).not.toContain('<source');
    expect(html).toContain('src="/img.webp"');
  });

  test('forwards extra img props (className, loading, style) onto the fallback img', () => {
    const html = renderToString(
      <OptimizedImage src="/img.webp" avifSrc={null} alt="Foto" className="card-icon-img" loading="lazy" />
    );

    expect(html).toContain('class="card-icon-img"');
    expect(html).toContain('loading="lazy"');
  });
});
