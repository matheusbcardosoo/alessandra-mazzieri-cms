import { OptimizedImage } from '@/components/OptimizedImage';
import type { BlockRendererProps } from '../_shared/types';
import type { CtaBlockData } from './schema';

export function CtaRenderer({ data }: BlockRendererProps<CtaBlockData>) {
  const title = data.title ?? 'Vamos conversar?';
  const text = data.text ?? 'Agende uma conversa inicial para entender o melhor plano.';
  const ctaLabel = data.ctaLabel ?? 'Agendar';
  const ctaHref = data.ctaHref ?? '/contato';
  const imageUrl = data.imageUrl ?? null;
  const imageAlt = data.imageAlt ?? '';
  const imageSide = data.imageSide ?? 'right';
  const dissolve = data.imageDissolve ?? true;
  const dissolveStrength = data.imageDissolveStrength ?? 'medium';
  const openInNewTab = data.ctaLinkMode === 'manual' && /^https?:\/\//i.test(ctaHref);

  const mediaClasses = imageUrl
    ? [
        'cta-block--with-media',
        `cta-block--img-${imageSide}`,
        dissolve ? `cta-block--dissolve-${dissolveStrength}` : 'cta-block--no-dissolve'
      ].join(' ')
    : 'cta-block--no-media';

  return (
    <div className={`cta-block ${mediaClasses}`.trim()}>
      <div className="cta-content">
        <div className="section-title" style={{ marginBottom: '1rem' }}>
          <h2>{title}</h2>
          {text && <p>{text}</p>}
        </div>
        <div className="cta-actions">
          <a className="btn btn-primary" href={ctaHref} target={openInNewTab ? '_blank' : undefined} rel={openInNewTab ? 'noreferrer' : undefined}>
            {ctaLabel}
          </a>
        </div>
      </div>
      {imageUrl && (
        <div className="cta-media" aria-hidden="true">
          <OptimizedImage src={imageUrl} avifSrc={data.avifSrc} alt={imageAlt} loading="lazy" />
        </div>
      )}
    </div>
  );
}
