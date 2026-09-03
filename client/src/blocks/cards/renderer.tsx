import type { CSSProperties } from 'react';
import DOMPurify from 'dompurify';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Icon, isRegisteredIcon } from '@/components/Icon';
import type { BlockRendererProps } from '../_shared/types';
import type { CardBlockData } from './schema';

// Título aceita <em> (só essa tag) pra reproduzir o destaque de cor da
// referência (ex.: "Você reconhece <em>alguma dessas sensações?</em>") sem
// abrir o campo pra HTML arbitrário — mesmo padrão de sanitização do
// RichText, mas sem o wrapper de rich-content que quebraria o <h2>.
function sanitizeTitle(html: string): string {
  return typeof window === 'undefined'
    ? html
    : DOMPurify.sanitize(html, { ALLOWED_TAGS: ['em'], ALLOWED_ATTR: [] });
}

// Separa a string de ícone em emojis individuais, respeitando clusters
// (emojis compostos por ZWJ/modificadores não são quebrados ao meio).
function splitEmojis(value: string): string[] {
  const str = (value ?? '').trim();
  if (!str) return [];
  const Segmenter = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (typeof Segmenter === 'function') {
    const seg = new Segmenter('pt', { granularity: 'grapheme' });
    return Array.from(seg.segment(str), (s) => s.segment).filter((g) => g.trim());
  }
  return Array.from(str).filter((g) => g.trim());
}

export function CardsRenderer({ data }: BlockRendererProps<CardBlockData>) {
  const layout = data.layout ?? 'auto';
  const variant = data.variant ?? 'feature';
  const layoutClass = layout === 'auto' ? 'cards-layout--auto' : `cards-layout--${layout}`;
  const variantClass = `cards-variant--${variant}`;

  // Cor da borda: padrão = primária do tema; personalizado = cor escolhida.
  // Cor do card: padrão = fundo do CSS; personalizado = cor escolhida.
  // Cor do texto: claro = fundo/destaque; escuro = texto/primária; personalizado = cores escolhidas.
  const textMode = data.textColorMode ?? 'dark';
  const textVars: Record<string, string> = {};
  if (textMode === 'light') {
    textVars['--card-title-color'] = 'var(--color-paper)';
    textVars['--card-text-color'] = 'var(--color-clay)';
  } else if (textMode === 'dark') {
    textVars['--card-title-color'] = 'var(--color-deep)';
    textVars['--card-text-color'] = 'var(--color-terracotta)';
  } else {
    if (data.titleColor) textVars['--card-title-color'] = data.titleColor;
    if (data.textColor) textVars['--card-text-color'] = data.textColor;
  }

  const gridStyle = {
    '--card-border-color':
      data.borderColorMode === 'custom' && data.borderColor ? data.borderColor : 'var(--color-terracotta)',
    ...(data.cardColorMode === 'custom' && data.cardColor ? { '--card-bg-color': data.cardColor } : {}),
    ...textVars
  } as CSSProperties;

  return (
    <div className="page-public-cards">
      {data.title && (
        <h2 className="cards-title" dangerouslySetInnerHTML={{ __html: sanitizeTitle(data.title) }} />
      )}
      {data.subtitle && <p className="cards-subtitle">{data.subtitle}</p>}
      <div className={`cards-grid ${layoutClass} ${variantClass}`.trim()} style={gridStyle}>
        {data.items.map((card) => (
          <div key={card.id} className="card-item">
            {(card.icon || card.iconImageUrl) && (
              <div className="card-icon">
                {((card.iconType === 'image' || (!card.iconType && card.iconImageUrl)) && card.iconImageUrl) ? (
                  <OptimizedImage
                    className="card-icon-img"
                    src={card.iconImageUrl}
                    avifSrc={card.avifSrc}
                    alt={card.iconAlt ?? ''}
                    loading="lazy"
                  />
                ) : isRegisteredIcon(card.icon) ? (
                  <Icon name={card.icon as string} className="card-icon-fa" />
                ) : (
                  <span className="card-icon-emoji" aria-hidden="true">
                    {splitEmojis(card.icon ?? '').map((emoji, index) => (
                      <span key={index} className="card-icon-emoji-item">{emoji}</span>
                    ))}
                  </span>
                )}
              </div>
            )}
            <h3 className="card-title">{card.title}</h3>
            <p className="card-text">{card.text}</p>
            {card.ctaLabel && card.ctaHref && (
              <a href={card.ctaHref} className="card-cta">{card.ctaLabel} →</a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
