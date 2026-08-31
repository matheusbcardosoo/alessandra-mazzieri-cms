import type { HomeSection } from '../types';

export function HomeSections({ sections }: { sections: HomeSection[] }) {
  const visibleSections = sections.filter((section) => section.visible !== false);

  return (
    <>
      {visibleSections.map((section) => {
        if (section.type === 'hero') return <Hero key={section.id} section={section} />;
        if (section.type === 'services') return <Services key={section.id} section={section} />;
        if (section.type === 'cta') return <CTA key={section.id} section={section} />;
        return <GenericSection key={section.id} section={section} />;
      })}
    </>
  );
}

function Hero({ section }: { section: HomeSection }) {
  const data = section.data as Record<string, unknown>;
  const heading = typeof data.heading === 'string' ? data.heading : section.title ?? '[Título de impacto sobre o seu negócio]';
  const subheading =
    typeof data.subheading === 'string'
      ? data.subheading
      : '[Descreva em 1-2 frases o que você oferece e para quem]';
  const ctaLabel = typeof data.ctaLabel === 'string' ? data.ctaLabel : 'Agendar sessao';
  const ctaHref = typeof data.ctaHref === 'string' ? data.ctaHref : '/contato';
  const secondaryCta = typeof data.secondaryCta === 'string' ? data.secondaryCta : 'Conhecer a abordagem';
  const secondaryHref = typeof data.secondaryHref === 'string' ? data.secondaryHref : '/sobre';
  const badges =
    Array.isArray(data.badges) && data.badges.every((item) => typeof item === 'string')
      ? (data.badges as string[])
      : ['Diferencial 1', 'Diferencial 2', 'Diferencial 3'];

  const rawMode = (data.mediaMode as string) || 'four_cards';
  const mediaMode = rawMode === 'single_card' ? 'cards_only' : ['single_image', 'cards_only', 'four_cards'].includes(rawMode) ? rawMode : 'four_cards';

  const fallbackQuote =
    'Cada sessao e um espaco seguro para voce compreender suas emocoes, criar novas rotas e caminhar com leveza.';

  // Dado bruto da seção "home" (sem schema tipado) — lê um card com fallback
  // seguro para qualquer campo que não seja do tipo esperado.
  const readHeroCard = (raw: unknown, defaults: { title: string; text: string }) => {
    const c = (raw as Record<string, unknown>) || {};
    return {
      title: typeof c.title === 'string' ? c.title : defaults.title,
      text: typeof c.text === 'string' ? c.text : defaults.text,
      icon: typeof c.icon === 'string' ? c.icon : undefined,
      url: typeof c.url === 'string' ? c.url : undefined,
      alt: typeof c.alt === 'string' ? c.alt : undefined
    };
  };

  const renderSingleImage = () => {
    const image = (data.singleImage as Record<string, unknown>) || {};
    const url = typeof image.url === 'string' ? image.url : '';
    const alt = typeof image.alt === 'string' ? image.alt : '';
    if (!url) return <div className="hero-image-placeholder">Sem imagem</div>;
    return (
      <div className="hero-single-image-frame">
        <img className="hero-single-image" src={url} alt={alt} />
      </div>
    );
  };

  const renderFourCards = () => {
    const fc = (data.fourCards as Record<string, unknown>) || {};
    const medium = readHeroCard(fc.medium, { title: fallbackQuote, text: 'Texto' });
    const small = Array.from({ length: 3 }).map((_, idx) => {
      const rawSmall = Array.isArray(fc.small) ? fc.small[idx] : undefined;
      const defaults = [
        { title: 'Equilibrio emocional', text: 'Ferramentas praticas para o dia a dia.' },
        { title: 'Relacoes saudaveis', text: 'Comunicacao e limites claros.' },
        { title: 'Autoconhecimento', text: 'Reconectar-se com quem voce e.' }
      ][idx];
      return readHeroCard(rawSmall, defaults);
    });

    return (
      <div className="hero-cards-grid">
        <div className="hero-card hero-card-medium">
          {medium.icon && <div className="hero-card-icon">{medium.icon}</div>}
          {medium.url && <img className="hero-card-image" src={medium.url} alt={medium.alt ?? ''} />}
          <p>{medium.title}</p>
          <strong>{medium.text}</strong>
        </div>
        <div className="hero-small-cards">
          {small.map((card, idx) => (
            <div key={idx} className="hero-card hero-card-small">
              {card.icon && <div className="hero-card-icon">{card.icon}</div>}
              {card.url && <img className="hero-card-image" src={card.url} alt={card.alt ?? ''} />}
              <strong>{card.title}</strong>
              <p>{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCardsOnly = () => {
    const fc = (data.fourCards as Record<string, unknown>) || {};
    const medium = readHeroCard(fc.medium, { title: fallbackQuote, text: 'Texto' });
    const small = Array.from({ length: 3 }).map((_, idx) => {
      const rawSmall = Array.isArray(fc.small) ? fc.small[idx] : undefined;
      const defaults = [
        { title: 'Equilibrio emocional', text: 'Ferramentas praticas para o dia a dia.' },
        { title: 'Relacoes saudaveis', text: 'Comunicacao e limites claros.' },
        { title: 'Autoconhecimento', text: 'Reconectar-se com quem voce e.' }
      ][idx];
      return readHeroCard(rawSmall, defaults);
    });

    return (
      <div className="heroCardsOnly">
        <div className="heroMediumRow">
          <div className="hero-card hero-card-medium">
            {medium.icon && <div className="hero-card-icon">{medium.icon}</div>}
            <p>{medium.title}</p>
            <strong>{medium.text}</strong>
          </div>
        </div>
        <div className="heroSmallRow">
          <div className="heroSmallGrid">
            {small.map((card, idx) => (
              <div key={idx} className="hero-card hero-card-small">
                {card.icon && <div className="hero-card-icon">{card.icon}</div>}
                <strong>{card.title}</strong>
                <p>{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="section-block">
      <div className="container container--flush hero">
        <div className="hero-text hero-overlay-bg">
          <h1
            className="organic-accent"
            style={{ fontSize: 'clamp(2.3rem, 4vw, 3.3rem)', margin: 0, color: 'var(--color-deep)' }}
          >
            {heading}
          </h1>
          {subheading && (
            <p style={{ maxWidth: '680px', margin: 0, color: 'var(--color-forest)', fontSize: '1.05rem' }}>{subheading}</p>
          )}
          <div className="hero-badges">
            {badges.map((badge) => (
              <span key={badge} className="badge">
                {badge}
              </span>
            ))}
        </div>
        <div className="flex">
          <a href={ctaHref} target="_blank" rel="noreferrer" className="btn btn-primary">
            {ctaLabel}
          </a>
          <a href={secondaryHref} className="btn btn-outline">
            {secondaryCta}
          </a>
        </div>
        <div className="muted" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <span>Atendimento online e presencial</span>
          <span>Sigilo e confidencialidade garantidos</span>
        </div>
      </div>
      <div className={`hero-visual hero-visual--${mediaMode}`}>
        {mediaMode === 'single_image' && renderSingleImage()}
        {mediaMode === 'cards_only' && renderCardsOnly()}
        {mediaMode === 'four_cards' && renderFourCards()}
      </div>
    </div>
  </section>
);
}

function Services({ section }: { section: HomeSection }) {
  const data = section.data as { items?: { title: string; description: string }[] };
  const items =
    data.items && data.items.length
      ? data.items
      : [
          { title: '[Serviço 1]', description: '[Breve descrição do serviço oferecido]' },
          { title: '[Serviço 2]', description: '[Breve descrição do serviço oferecido]' },
          { title: '[Serviço 3]', description: '[Breve descrição do serviço oferecido]' }
        ];

  return (
    <section className="section-block">
      <div className="container section-tonal services-section">
        <div className="section-title">
          <h2>{section.title ?? 'Como posso ajudar'}</h2>
          <p>Escolha o formato que mais atende suas necessidades agora.</p>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {items.map((item) => (
            <div key={item.title} className="editorial-card">
              <h3 className="service-card__title">{item.title}</h3>
              <p style={{ margin: 0, color: 'var(--color-forest)' }}>{item.description}</p>
              <a className="link" href="/contato" style={{ marginTop: '1rem' }}>
                Saiba mais
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA({ section }: { section: HomeSection }) {
  const data = section.data as Record<string, unknown>;
  const text = typeof data.text === 'string' ? data.text : 'Agende uma conversa inicial para entender o melhor plano.';
  const ctaLabel = typeof data.ctaLabel === 'string' ? data.ctaLabel : 'Agendar';
  const ctaHref = typeof data.ctaHref === 'string' ? data.ctaHref : '/contato';

  return (
    <section className="section-block">
      <div className="container">
        <div className="section-neutral">
          <div className="section-title" style={{ marginBottom: '1rem' }}>
            <h2>{section.title ?? 'Vamos conversar?'}</h2>
            <p>{text}</p>
          </div>
          <div className="flex">
            <a className="btn btn-primary" href={ctaHref} target="_blank" rel="noreferrer">
              {ctaLabel}
            </a>
            <a className="btn btn-outline" href="/sobre">
              Saiba mais sobre John Doe
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function GenericSection({ section }: { section: HomeSection }) {
  return (
    <section className="section-block">
      <div className="container card">
        <div className="section-title">
          <h2>{section.title ?? section.type}</h2>
          <p>Conteudo configuravel via painel.</p>
        </div>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
          {JSON.stringify(section.data, null, 2)}
        </pre>
      </div>
    </section>
  );
}
