import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera } from '@fortawesome/free-solid-svg-icons';
import { ImagePickerModal } from '@/components/ImagePickerModal';
import type { CardBlockData, CardItem } from '@/types';
import type { BlockFormProps } from '../_shared/types';
import { ColorField } from '../_shared/ColorField';
import { getPrimaryHex } from '../_shared/colorUtils';

export function CardsBlockForm({ value, onChange, onUploadingChange: _onUploadingChange }: BlockFormProps<CardBlockData>) {
  const primaryHex = getPrimaryHex();
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconTargetId, setIconTargetId] = useState<string | null>(null);

  const handleAddCard = () => {
    const newCard: CardItem = {
      id: uuidv4(),
      icon: '*',
      iconType: 'emoji',
      iconImageUrl: null,
      iconImageId: null,
      iconAlt: null,
      title: 'Novo Card',
      text: 'Descricao do card',
      ctaLabel: null,
      ctaHref: null
    };
    onChange({ ...value, items: [...value.items, newCard] });
  };

  const handleRemoveCard = (id: string) => {
    onChange({ ...value, items: value.items.filter((c) => c.id !== id) });
  };

  const handleUpdateCard = (id: string, updates: Partial<typeof value.items[0]>) => {
    onChange({
      ...value,
      items: value.items.map((c) => (c.id === id ? { ...c, ...updates } : c))
    });
  };

  const handleSelectIconImage = (image: { mediaId: string; src: string; alt: string; avifSrc?: string | null }) => {
    if (!iconTargetId) return;
    handleUpdateCard(iconTargetId, {
      iconType: 'image',
      iconImageUrl: image.src,
      avifSrc: image.avifSrc ?? null,
      iconImageId: image.mediaId,
      iconAlt: image.alt || null
    });
    setIconPickerOpen(false);
    setIconTargetId(null);
  };

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Título (opcional)</label>
          <input value={value.title ?? ''} onChange={(e) => onChange({ ...value, title: e.target.value })} placeholder="Ex: Nossos Serviços" />
        </div>
        <div className="editor-field">
          <label>Subtítulo (opcional)</label>
          <input value={value.subtitle ?? ''} onChange={(e) => onChange({ ...value, subtitle: e.target.value })} placeholder="Texto descritivo" />
        </div>

        <div className="editor-field">
          <label>Layout</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'auto', label: 'Auto' },
              { value: '2', label: '2 cols' },
              { value: '3', label: '3 cols' },
              { value: '4', label: '4 cols' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={value.layout === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, layout: opt.value as CardBlockData['layout'] })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field">
          <label>Variações da borda</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'feature', label: 'Com sombra' },
              { value: 'simple', label: 'Sem sombra' },
              { value: 'borderless', label: 'Sem borda' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={value.variant === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, variant: opt.value as CardBlockData['variant'] })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <ColorField
          label="Cor da borda"
          mode={value.borderColorMode ?? 'default'}
          color={value.borderColor}
          fallbackHex={primaryHex}
          defaultHint="Usa a cor primária do site."
          onChange={(next) => onChange({ ...value, borderColorMode: next.mode, borderColor: next.color })}
        />

        <ColorField
          label="Cor do card"
          mode={value.cardColorMode ?? 'default'}
          color={value.cardColor}
          fallbackHex="#ffffff"
          defaultHint="Usa a cor de fundo padrão do card."
          onChange={(next) => onChange({ ...value, cardColorMode: next.mode, cardColor: next.color })}
        />

        <div className="editor-field">
          <label>Cor do texto</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Escuro' },
              { value: 'custom', label: 'Personalizado' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={(value.textColorMode ?? 'dark') === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, textColorMode: opt.value as NonNullable<CardBlockData['textColorMode']> })}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {(value.textColorMode ?? 'dark') === 'custom' ? (
            <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(value.titleColor ?? '') ? (value.titleColor as string) : primaryHex}
                  onChange={(e) => onChange({ ...value, titleColor: e.target.value })}
                  style={{ width: '48px', height: '36px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                  aria-label="Cor do título"
                />
                <input
                  type="text"
                  value={value.titleColor ?? ''}
                  onChange={(e) => onChange({ ...value, titleColor: e.target.value })}
                  placeholder="#000000"
                  style={{ width: '110px' }}
                />
                <span className="muted small">Título</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(value.textColor ?? '') ? (value.textColor as string) : '#555555'}
                  onChange={(e) => onChange({ ...value, textColor: e.target.value })}
                  style={{ width: '48px', height: '36px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                  aria-label="Cor da descrição"
                />
                <input
                  type="text"
                  value={value.textColor ?? ''}
                  onChange={(e) => onChange({ ...value, textColor: e.target.value })}
                  placeholder="#555555"
                  style={{ width: '110px' }}
                />
                <span className="muted small">Descrição</span>
              </div>
            </div>
          ) : (
            <small className="muted" style={{ display: 'block', marginTop: '0.35rem' }}>
              {(value.textColorMode ?? 'dark') === 'light'
                ? 'Título com a cor de fundo e descrição com a cor de destaque do tema.'
                : 'Título com a cor de texto e descrição com a cor primária do tema.'}
            </small>
          )}
        </div>

        <div className="editor-field" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ margin: 0 }}>Cards ({value.items.length})</label>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleAddCard}>
              + Adicionar Card
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {value.items.map((card, idx) => (
              <div key={card.id} className="admin-card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <strong className="muted small">Card {idx + 1}</strong>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => handleRemoveCard(card.id)}
                    style={{ padding: '0.25rem 0.5rem' }}
                  >
                    Remover
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Icone
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      {[
                        { value: 'emoji', label: 'Emoji' },
                        { value: 'image', label: 'PNG' }
                      ].map((opt) => {
                        const resolvedType = card.iconType ?? (card.iconImageUrl ? 'image' : 'emoji');
                        const isActive = resolvedType === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() =>
                              handleUpdateCard(card.id, {
                                iconType: opt.value as 'emoji' | 'image'
                              })
                            }
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    {((card.iconType ?? (card.iconImageUrl ? 'image' : 'emoji')) === 'emoji') && (
                      <input
                        value={card.icon ?? ''}
                        onChange={(e) => handleUpdateCard(card.id, { icon: e.target.value })}
                        placeholder="Ex: ?"
                        style={{ width: '100%' }}
                      />
                    )}

                    {((card.iconType ?? (card.iconImageUrl ? 'image' : 'emoji')) === 'image') && (
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {card.iconImageUrl ? (
                          <div className="image-selected-preview">
                            <img src={card.iconImageUrl} alt={card.iconAlt ?? ''} />
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                  setIconTargetId(card.id);
                                  setIconPickerOpen(true);
                                }}
                              >
                                Trocar imagem
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleUpdateCard(card.id, { iconImageUrl: null, iconImageId: null, avifSrc: null })}
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => {
                              setIconTargetId(card.id);
                              setIconPickerOpen(true);
                            }}
                          >
                            <FontAwesomeIcon icon={faCamera} /> Selecionar imagem
                          </button>
                        )}

                        <input
                          value={card.iconImageUrl ?? ''}
                          onChange={(e) =>
                            handleUpdateCard(card.id, {
                              iconImageUrl: e.target.value,
                              iconImageId: null,
                              avifSrc: null
                            })
                          }
                          placeholder="URL da imagem (PNG/WebP)"
                          style={{ width: '100%' }}
                        />

                        <input
                          value={card.iconAlt ?? ''}
                          onChange={(e) => handleUpdateCard(card.id, { iconAlt: e.target.value })}
                          placeholder="Alt (opcional)"
                          style={{ width: '100%' }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Título *
                    </label>
                    <input
                      value={card.title}
                      onChange={(e) => handleUpdateCard(card.id, { title: e.target.value })}
                      placeholder="Ex: Rápido"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Texto *
                    </label>
                    <textarea
                      value={card.text}
                      onChange={(e) => handleUpdateCard(card.id, { text: e.target.value })}
                      placeholder="Descrição do card"
                      rows={2}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                        CTA Texto (opcional)
                      </label>
                      <input
                        value={card.ctaLabel ?? ''}
                        onChange={(e) => handleUpdateCard(card.id, { ctaLabel: e.target.value })}
                        placeholder="Ex: Saiba mais"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                        CTA URL (opcional)
                      </label>
                      <input
                        value={card.ctaHref ?? ''}
                        onChange={(e) => handleUpdateCard(card.id, { ctaHref: e.target.value })}
                        placeholder="https://..."
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ImagePickerModal
        open={iconPickerOpen}
        onClose={() => {
          setIconPickerOpen(false);
          setIconTargetId(null);
        }}
        onSelect={(img) => handleSelectIconImage({ mediaId: img.mediaId, src: img.src, alt: img.alt, avifSrc: img.avifSrc })}
        currentMediaId={
          iconTargetId
            ? value.items.find((item) => item.id === iconTargetId)?.iconImageId ?? undefined
            : undefined
        }
      />
    </div>
  );
}
