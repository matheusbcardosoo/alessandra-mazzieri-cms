import { Switch } from '@/components/AdminUI';
import type { WhatsAppCtaBlockData } from '@/types';
import type { BlockFormProps } from '../_shared/types';

export function WhatsAppCtaBlockForm({ value, onChange }: BlockFormProps<WhatsAppCtaBlockData>) {
  const label = value.label ?? 'Fale conosco no WhatsApp';
  const style = value.style ?? 'primary';
  const openInNewTab = value.openInNewTab ?? true;
  const hideWhenDisabled = value.hideWhenDisabled ?? true;

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Texto do botão</label>
          <input
            type="text"
            value={label}
            onChange={(e) => onChange({ ...value, label: e.target.value })}
            placeholder="Ex: Fale conosco no WhatsApp"
          />
        </div>

        <div className="editor-field">
          <label>Estilo</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'primary', label: 'Primário' },
              { value: 'secondary', label: 'Secundário' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={style === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, style: opt.value as 'primary' | 'secondary' })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ margin: 0 }}>Abrir em nova aba</label>
          <Switch
            checked={openInNewTab}
            onChange={(checked) => onChange({ ...value, openInNewTab: checked })}
          />
        </div>

        <div className="editor-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ margin: 0 }}>Ocultar quando WhatsApp estiver desativado</label>
          <Switch
            checked={hideWhenDisabled}
            onChange={(checked) => onChange({ ...value, hideWhenDisabled: checked })}
          />
        </div>

        <div className="editor-field" style={{ gridColumn: '1 / -1' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            ℹ️ O link e mensagem do WhatsApp são gerenciados em <strong>Configurações do Site</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
