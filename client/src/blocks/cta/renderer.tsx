import DOMPurify from 'dompurify';
import { OptimizedImage } from '@/components/OptimizedImage';
import type { BlockRendererProps } from '../_shared/types';
import type { CtaBlockData } from './schema';

// Texto aceita <em> (só essa tag) pra reproduzir o destaque de trecho da
// referência (ex.: "no <em>conforto da sua casa</em>") sem abrir o campo
// pra HTML arbitrário — mesmo padrão de sanitização do bloco cards.
function sanitizeText(html: string): string {
  return typeof window === 'undefined'
    ? html
    : DOMPurify.sanitize(html, { ALLOWED_TAGS: ['em'], ALLOWED_ATTR: [] });
}

export function CtaRenderer({ data }: BlockRendererProps<CtaBlockData>) {
  const title = data.title ?? 'Vamos conversar?';
  const text = data.text ?? 'Agende uma conversa inicial para entender o melhor plano.';
  const ctaLabel = data.ctaLabel ?? '';
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
          {text && <p dangerouslySetInnerHTML={{ __html: sanitizeText(text) }} />}
        </div>
        {ctaLabel && (
          <div className="cta-actions">
            <a className="btn btn-primary" href={ctaHref} target={openInNewTab ? '_blank' : undefined} rel={openInNewTab ? 'noreferrer' : undefined}>
              {ctaLabel}
            </a>
          </div>
        )}
      </div>
      {imageUrl && (
        <div className="cta-media" aria-hidden="true">
          <OptimizedImage src={imageUrl} avifSrc={data.avifSrc} alt={imageAlt} loading="lazy" />
        </div>
      )}
    </div>
  );
}
