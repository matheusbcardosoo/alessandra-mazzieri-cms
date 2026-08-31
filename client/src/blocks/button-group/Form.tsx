import { Switch } from '@/components/AdminUI';
import { LinkPicker } from '@/components/LinkPicker';
import type { ButtonGroupBlockData, ButtonGroupButton } from '@/types';
import type { BlockFormProps } from '../_shared/types';

export function ButtonGroupBlockForm({ value, onChange }: BlockFormProps<ButtonGroupBlockData>) {
  const buttons = value.buttons ?? [];
  const align = value.align ?? 'start';
  const stackOnMobile = value.stackOnMobile ?? true;

  const handleAddButton = () => {
    if (buttons.length >= 2) return;
    onChange({
      ...value,
      buttons: [...buttons, { label: 'Novo botão', href: '', variant: 'primary' }]
    });
  };

  const handleUpdateButton = (index: number, updates: Partial<ButtonGroupButton>) => {
    const next = [...buttons];
    next[index] = { ...next[index], ...updates };
    onChange({ ...value, buttons: next });
  };

  const handleRemoveButton = (index: number) => {
    onChange({ ...value, buttons: buttons.filter((_, i) => i !== index) });
  };

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Alinhamento</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'start', label: 'Esquerda' },
              { value: 'center', label: 'Centro' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={align === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, align: opt.value as 'start' | 'center' })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ margin: 0 }}>Empilhar em mobile</label>
          <Switch
            checked={stackOnMobile}
            onChange={(checked) => onChange({ ...value, stackOnMobile: checked })}
          />
        </div>

        <div className="editor-field">
          <label>Botões (máximo 2)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {buttons.map((button, index) => (
              <div key={index} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label className="small">Texto do botão</label>
                    <input
                      type="text"
                      value={button.label}
                      onChange={(e) => handleUpdateButton(index, { label: e.target.value })}
                      placeholder="Ex: Saiba mais"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label className="small">Link</label>
                    <LinkPicker
                      value={{
                        mode: button.linkMode ?? 'manual',
                        href: button.href,
                        pageId: button.pageId ?? undefined,
                        pageKey: button.pageKey ?? undefined,
                        slug: button.slug ?? undefined
                      }}
                      onChange={(val) =>
                        handleUpdateButton(index, {
                          linkMode: val.mode,
                          href: val.href ?? '',
                          pageId: val.pageId ?? null,
                          pageKey: val.pageKey ?? null,
                          slug: val.slug ?? null
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="small">Estilo</label>
                    <div className="page-columns-toggle compact">
                      {[
                        { value: 'primary', label: 'Primário' },
                        { value: 'secondary', label: 'Secundário' }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={button.variant === opt.value ? 'active' : ''}
                          onClick={() => handleUpdateButton(index, { variant: opt.value as 'primary' | 'secondary' })}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleRemoveButton(index)}
                  >
                    Remover botão
                  </button>
                </div>
              </div>
            ))}
            {buttons.length < 2 && (
              <button type="button" className="btn btn-outline" onClick={handleAddButton}>
                + Adicionar botão
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
