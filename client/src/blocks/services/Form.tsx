import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ServicesBlockData } from '@/types';
import type { BlockFormProps } from '@/blocks/_shared/types';
import { LinkPicker, type LinkPickerValue } from '@/components/LinkPicker';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown, faTrash, faCamera } from '@fortawesome/free-solid-svg-icons';
import { ColorField } from '@/blocks/_shared/ColorField';
import { getPrimaryHex } from '@/blocks/_shared/colorUtils';
import { ImagePickerModal } from '@/components/ImagePickerModal';

const MAX_ITEMS = 4; // Limite fixo de 4 itens
const MAX_DESCRIPTION = 160;

// Helper para normalizar item do serviço para LinkPickerValue
const normalizeLinkValue = (item: { href: string; linkMode?: 'page' | 'manual'; pageId?: string | null; pageKey?: string | null; slug?: string | null }): LinkPickerValue => {
  // Se já tem linkMode salvo, usar ele
  if (item.linkMode) {
    return {
      mode: item.linkMode,
      href: item.href || '',
      pageId: item.pageId,
      pageKey: item.pageKey,
      slug: item.slug
    };
  }

  // Fallback para itens antigos sem linkMode
  if (!item.href || item.href.trim() === '') {
    return { mode: 'manual', href: '' };
  }
  return { mode: 'manual', href: item.href.trim() };
};

export function ServicesForm({ value, onChange }: BlockFormProps<ServicesBlockData>) {
  const primaryHex = getPrimaryHex();
  const items = value.items ?? [];
  // 'default' = ícone do bloco (fallback); string = id do item sendo editado; null = fechado.
  const [iconPickerTarget, setIconPickerTarget] = useState<'default' | string | null>(null);

  const handleSelectIcon = (image: { mediaId: string; src: string; alt: string; avifSrc?: string | null }) => {
    if (iconPickerTarget === 'default') {
      onChange({
        ...value,
        iconImageId: image.mediaId,
        iconImageUrl: image.src,
        avifSrc: image.avifSrc ?? null,
        iconAlt: image.alt || null
      });
    } else if (iconPickerTarget) {
      handleUpdateItem(iconPickerTarget, {
        iconImageId: image.mediaId,
        iconImageUrl: image.src,
        avifSrc: image.avifSrc ?? null,
        iconAlt: image.alt || null
      });
    }
    setIconPickerTarget(null);
  };

  const handleRemoveIcon = () => {
    onChange({ ...value, iconImageId: null, iconImageUrl: null, avifSrc: null, iconAlt: null });
  };

  const handleRemoveItemIcon = (id: string) => {
    handleUpdateItem(id, { iconImageId: null, iconImageUrl: null, avifSrc: null, iconAlt: null });
  };

  const handleAddItem = () => {
    if (items.length >= MAX_ITEMS) return;
    const newItem = {
      id: uuidv4(),
      title: 'Novo serviço',
      href: '/servicos/novo-servico'
    };
    onChange({ ...value, items: [...items, newItem] });
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    onChange({ ...value, items: items.filter((item) => item.id !== id) });
  };

  const handleUpdateItem = (id: string, updates: Partial<typeof items[number]>) => {
    onChange({
      ...value,
      items: items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    });
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const updated = [...items];
    [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
    onChange({ ...value, items: updated });
  };

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Título da seção</label>
          <input
            value={value.sectionTitle ?? ''}
            onChange={(e) => onChange({ ...value, sectionTitle: e.target.value })}
            placeholder="Serviços"
          />
        </div>

        <div className="editor-field">
          <label>Texto do botão (opcional)</label>
          <input
            value={value.buttonLabel ?? ''}
            onChange={(e) => onChange({ ...value, buttonLabel: e.target.value })}
            placeholder="Saiba mais"
          />
        </div>

        <ColorField
          label="Cor do texto"
          mode={value.textColorMode ?? 'default'}
          color={value.textColor}
          fallbackHex="#1f2d16"
          defaultHint="Usa a cor de texto padrão do tema (título e descrição de cada item)."
          onChange={(next) => onChange({ ...value, textColorMode: next.mode, textColor: next.color })}
        />

        <ColorField
          label="Cor do botão"
          mode={value.buttonColorMode ?? 'default'}
          color={value.buttonColor}
          fallbackHex={primaryHex}
          defaultHint="Usa a cor padrão do site."
          onChange={(next) => onChange({ ...value, buttonColorMode: next.mode, buttonColor: next.color })}
        />

        <div className="editor-field" style={{ gridColumn: '1 / -1' }}>
          <label>Ícone padrão (itens sem ícone próprio usam este)</label>
          {value.iconImageUrl ? (
            <div className="image-selected-preview">
              <img src={value.iconImageUrl} alt={value.iconAlt ?? ''} style={{ maxWidth: '80px' }} />
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setIconPickerTarget('default')}>
                  Trocar imagem
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleRemoveIcon}>
                  Usar ícone padrão
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline" onClick={() => setIconPickerTarget('default')}>
                <FontAwesomeIcon icon={faCamera} /> Selecionar imagem
              </button>
              <small className="muted">Usando o ícone padrão da marca.</small>
            </div>
          )}
        </div>

        <div className="editor-field" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ margin: 0 }}>Itens ({items.length})</label>
            {items.length < MAX_ITEMS && (
              <button type="button" className="btn btn-sm btn-primary" onClick={handleAddItem}>
                + Adicionar item
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {items.map((item, idx) => (
              <div key={item.id} className="admin-card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <strong className="muted small">Item {idx + 1}</strong>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleMoveItem(idx, 'up')}
                      disabled={idx === 0}
                      aria-label="Subir item"
                      title="Subir item"
                      style={{ padding: '0.35rem 0.6rem', color: 'var(--color-ink)' }}
                    >
                      <FontAwesomeIcon icon={faArrowUp} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleMoveItem(idx, 'down')}
                      disabled={idx === items.length - 1}
                      aria-label="Descer item"
                      title="Descer item"
                      style={{ padding: '0.35rem 0.6rem', color: 'var(--color-ink)' }}
                    >
                      <FontAwesomeIcon icon={faArrowDown} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={items.length <= 1}
                      aria-label="Remover item"
                      title="Remover item"
                      style={{ padding: '0.35rem 0.6rem', color: 'var(--color-ink)' }}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Título do serviço
                    </label>
                    <input
                      value={item.title}
                      onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
                      placeholder="Ex.: Consultoria Financeira"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Ícone deste item (opcional)
                    </label>
                    {item.iconImageUrl ? (
                      <div className="image-selected-preview">
                        <img src={item.iconImageUrl} alt={item.iconAlt ?? ''} style={{ maxWidth: '56px' }} />
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setIconPickerTarget(item.id)}
                          >
                            Trocar imagem
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleRemoveItemIcon(item.id)}>
                            Usar ícone padrão
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setIconPickerTarget(item.id)}
                      >
                        <FontAwesomeIcon icon={faCamera} /> Selecionar imagem
                      </button>
                    )}
                  </div>

                  <div>
                    <LinkPicker
                      label="Link / slug"
                      value={normalizeLinkValue(item)}
                      onChange={(linkValue) => handleUpdateItem(item.id, {
                        href: linkValue.href,
                        linkMode: linkValue.mode,
                        pageId: linkValue.pageId,
                        pageKey: linkValue.pageKey,
                        slug: linkValue.slug
                      })}
                    />
                  </div>

                  <div>
                    <label className="small" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Descrição curta</span>
                      <span className="muted">{(item.description ?? '').length}/{MAX_DESCRIPTION}</span>
                    </label>
                    <textarea
                      value={item.description ?? ''}
                      onChange={(e) => handleUpdateItem(item.id, { description: e.target.value.slice(0, MAX_DESCRIPTION) })}
                      placeholder="Breve descrição do que esse serviço resolve para o cliente."
                      rows={2}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <small className="muted" style={{ display: 'block', marginTop: '0.5rem' }}>
            Você pode adicionar de 1 a {MAX_ITEMS} itens. Cada um pode ter seu próprio ícone, ou usar o padrão do bloco.
          </small>
        </div>
      </div>

      <ImagePickerModal
        open={iconPickerTarget !== null}
        onClose={() => setIconPickerTarget(null)}
        onSelect={handleSelectIcon}
        currentMediaId={
          iconPickerTarget === 'default'
            ? value.iconImageId ?? undefined
            : items.find((item) => item.id === iconPickerTarget)?.iconImageId ?? undefined
        }
      />
    </div>
  );
}
