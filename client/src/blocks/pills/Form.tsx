import type { PillsBlockData, PillItem } from '@/types';
import type { BlockFormProps } from '../_shared/types';

export function PillsBlockForm({ value, onChange }: BlockFormProps<PillsBlockData>) {
  // Use pills as primary field, items as fallback for legacy data
  const rawItems = value.pills ?? value.items ?? [];
  // Normalize to PillItem objects
  const items = rawItems.map((item): PillItem =>
    typeof item === 'string' ? { text: item, href: null, linkMode: null, articleSlug: null } : item
  );
  const size = value.size ?? 'sm';
  const variant = value.variant ?? 'neutral';

  const handleAddItem = () => {
    onChange({
      ...value,
      pills: [...items, { text: 'Nova tag', href: null, linkMode: null, articleSlug: null }]
    });
  };

  const handleUpdateItem = (index: number, updates: Partial<PillItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...updates };
    onChange({ ...value, pills: next });
  };

  const handleRemoveItem = (index: number) => {
    onChange({ ...value, pills: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Tamanho</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'sm', label: 'Pequeno' },
              { value: 'md', label: 'Médio' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={size === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, size: opt.value as 'sm' | 'md' })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field">
          <label>Estilo</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'neutral', label: 'Neutro' },
              { value: 'primary', label: 'Primário' },
              { value: 'accent', label: 'Destaque' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={variant === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, variant: opt.value as 'neutral' | 'primary' | 'accent' })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field">
          <label>Pills/Tags</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {items.map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                padding: '1rem',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                background: 'var(--color-bg-soft)'
              }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => handleUpdateItem(index, { text: e.target.value })}
                    placeholder="Texto da tag"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleRemoveItem(index)}
                    style={{ padding: '0.5rem' }}
                  >
                    Remover
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Link (opcional)</label>
                  <div className="page-columns-toggle compact">
                    <button
                      type="button"
                      className={!item.linkMode || item.linkMode === 'manual' ? 'active' : ''}
                      onClick={() => handleUpdateItem(index, { linkMode: 'manual', articleSlug: null })}
                    >
                      URL Manual
                    </button>
                    <button
                      type="button"
                      className={item.linkMode === 'article' ? 'active' : ''}
                      onClick={() => handleUpdateItem(index, { linkMode: 'article', href: null })}
                    >
                      Artigo
                    </button>
                  </div>

                  {(!item.linkMode || item.linkMode === 'manual') && (
                    <input
                      type="text"
                      value={item.href ?? ''}
                      onChange={(e) => handleUpdateItem(index, { href: e.target.value || null })}
                      placeholder="https://exemplo.com ou /sobre"
                    />
                  )}

                  {item.linkMode === 'article' && (
                    <input
                      type="text"
                      value={item.articleSlug ?? ''}
                      onChange={(e) => handleUpdateItem(index, { articleSlug: e.target.value || null })}
                      placeholder="slug-do-artigo"
                    />
                  )}

                  {item.linkMode === 'article' && item.articleSlug && (
                    <small className="muted" style={{ fontSize: '0.75rem' }}>
                      Link: /blog/{item.articleSlug}
                    </small>
                  )}
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-outline" onClick={handleAddItem}>
              + Adicionar tag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
