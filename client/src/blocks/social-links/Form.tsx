import { Switch } from '@/components/AdminUI';
import type { SocialLinksBlockData } from '@/types';
import type { BlockFormProps } from '../_shared/types';

export function SocialLinksBlockForm({ value, onChange }: BlockFormProps<SocialLinksBlockData>) {
  const title = value.title ?? '';
  const variant = value.variant ?? 'list';
  const showIcons = value.showIcons ?? true;
  const columns = value.columns ?? 1;
  const align = value.align ?? 'start';

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Título (opcional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            placeholder="Ex: Siga-nos"
          />
        </div>

        <div className="editor-field">
          <label>Estilo de apresentação</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'list', label: 'Lista' },
              { value: 'chips', label: 'Chips' },
              { value: 'buttons', label: 'Botões' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={variant === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, variant: opt.value as 'list' | 'chips' | 'buttons' })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ margin: 0 }}>Mostrar ícones</label>
          <Switch
            checked={showIcons}
            onChange={(checked) => onChange({ ...value, showIcons: checked })}
          />
        </div>

        {variant === 'list' && (
          <div className="editor-field">
            <label>Colunas</label>
            <div className="page-columns-toggle compact">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={columns === n ? 'active' : ''}
                  onClick={() => onChange({ ...value, columns: n })}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="editor-field">
          <label>Alinhamento</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'left', label: 'Esquerda' },
              { value: 'center', label: 'Centro' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={align === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, align: opt.value as 'left' | 'center' })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field" style={{ gridColumn: '1 / -1' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            ℹ️ As redes sociais são gerenciadas em <strong>Configurações do Site</strong>.
            Este bloco renderiza automaticamente todas as redes visíveis.
          </p>
        </div>
      </div>
    </div>
  );
}
