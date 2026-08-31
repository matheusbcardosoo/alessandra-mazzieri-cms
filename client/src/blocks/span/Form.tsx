import type { SpanBlockData } from '@/types';
import type { BlockFormProps } from '../_shared/types';

export function SpanBlockForm({ value, onChange }: BlockFormProps<SpanBlockData>) {
  const kind = value.kind ?? 'accent-bar';

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Tipo</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'accent-bar', label: 'Barra de destaque' },
              { value: 'muted-text', label: 'Texto discreto' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={kind === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, kind: opt.value as 'accent-bar' | 'muted-text', text: opt.value === 'accent-bar' ? undefined : value.text })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {kind === 'muted-text' && (
          <div className="editor-field">
            <label>Texto</label>
            <input
              type="text"
              value={value.text ?? ''}
              onChange={(e) => onChange({ ...value, text: e.target.value })}
              placeholder="Digite o texto"
            />
          </div>
        )}
      </div>
    </div>
  );
}
