import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/AdminUI';
import type { FormBlockData, FormField } from '@/types';
import type { BlockFormProps } from '../_shared/types';
import { ColorField } from '../_shared/ColorField';
import { getPrimaryHex } from '../_shared/colorUtils';

export function FormBlockForm({ value, onChange }: BlockFormProps<FormBlockData>) {
  const primaryHex = getPrimaryHex();
  const handleAddField = () => {
    const newField = {
      id: uuidv4(),
      type: 'text' as const,
      label: 'Novo Campo',
      placeholder: null,
      required: false,
      options: null
    };
    onChange({ ...value, fields: [...value.fields, newField] });
  };

  const handleRemoveField = (id: string) => {
    onChange({ ...value, fields: value.fields.filter((f) => f.id !== id) });
  };

  const handleUpdateField = (id: string, updates: Partial<typeof value.fields[0]>) => {
    onChange({
      ...value,
      fields: value.fields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    });
  };

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Título do formulário (opcional)</label>
          <input value={value.title ?? ''} onChange={(e) => onChange({ ...value, title: e.target.value })} placeholder="Ex: Entre em contato" />
        </div>
        <div className="editor-field">
          <label>Descrição (opcional)</label>
          <input value={value.description ?? ''} onChange={(e) => onChange({ ...value, description: e.target.value })} placeholder="Texto descritivo" />
        </div>

        <div className="editor-field" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ margin: 0 }}>Campos ({value.fields.length})</label>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleAddField}>
              + Adicionar Campo
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {value.fields.map((field, idx) => (
              <div key={field.id} className="admin-card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <strong className="muted small">Campo {idx + 1}</strong>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => handleRemoveField(field.id)}
                    style={{ padding: '0.25rem 0.5rem' }}
                  >
                    Remover
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Tipo de campo
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) => handleUpdateField(field.id, { type: e.target.value as FormField['type'] })}
                      style={{ width: '100%' }}
                    >
                      <option value="text">Texto</option>
                      <option value="email">Email</option>
                      <option value="tel">Telefone</option>
                      <option value="textarea">Texto longo</option>
                      <option value="select">Seleção</option>
                    </select>
                  </div>

                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Obrigatório?
                    </label>
                    <Switch
                      checked={field.required}
                      onChange={(val) => handleUpdateField(field.id, { required: val })}
                      label=""
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Rótulo *
                    </label>
                    <input
                      value={field.label}
                      onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                      placeholder="Ex: Nome completo"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Placeholder (opcional)
                    </label>
                    <input
                      value={field.placeholder ?? ''}
                      onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                      placeholder="Texto de exemplo"
                      style={{ width: '100%' }}
                    />
                  </div>

                  {field.type === 'select' && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                        Opções (uma por linha)
                      </label>
                      <textarea
                        value={(field.options ?? []).join('\n')}
                        onChange={(e) =>
                          handleUpdateField(field.id, {
                            options: e.target.value.split('\n').filter((o) => o.trim())
                          })
                        }
                        placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                        rows={4}
                        style={{ width: '100%', resize: 'vertical' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="editor-field">
          <label>Texto do botão</label>
          <input value={value.submitLabel ?? 'Enviar'} onChange={(e) => onChange({ ...value, submitLabel: e.target.value })} />
        </div>

        <div className="editor-field">
          <label>Mensagem de sucesso</label>
          <input
            value={value.successMessage ?? 'Mensagem enviada!'}
            onChange={(e) => onChange({ ...value, successMessage: e.target.value })}
          />
        </div>

        <ColorField
          label="Cor do texto"
          mode={value.textColorMode ?? 'default'}
          color={value.textColor}
          fallbackHex="#1f2d16"
          defaultHint="Usa a cor de texto padrão do tema (título, descrição e rótulos)."
          onChange={(next) => onChange({ ...value, textColorMode: next.mode, textColor: next.color })}
        />

        <ColorField
          label="Cor do botão"
          mode={value.buttonColorMode ?? 'default'}
          color={value.buttonColor}
          fallbackHex={primaryHex}
          defaultHint="Usa a cor primária do site."
          onChange={(next) => onChange({ ...value, buttonColorMode: next.mode, buttonColor: next.color })}
        />
      </div>
    </div>
  );
}
