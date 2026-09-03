import { v4 as uuidv4 } from 'uuid';
import type { FaqBlockData, FaqItem } from '@/types';
import type { BlockFormProps } from '../_shared/types';

export function FaqBlockForm({ value, onChange }: BlockFormProps<FaqBlockData>) {
  const handleAddItem = () => {
    const newItem: FaqItem = { id: uuidv4(), question: 'Nova pergunta', answer: 'Resposta da pergunta.' };
    onChange({ ...value, items: [...value.items, newItem] });
  };

  const handleRemoveItem = (id: string) => {
    onChange({ ...value, items: value.items.filter((item) => item.id !== id) });
  };

  const handleUpdateItem = (id: string, updates: Partial<FaqItem>) => {
    onChange({
      ...value,
      items: value.items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    });
  };

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Título (opcional)</label>
          <input
            value={value.title ?? ''}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            placeholder="Ex: Dúvidas frequentes"
          />
        </div>
        <div className="editor-field">
          <label>Subtítulo (opcional)</label>
          <input
            value={value.subtitle ?? ''}
            onChange={(e) => onChange({ ...value, subtitle: e.target.value })}
            placeholder="Texto descritivo"
          />
        </div>

        <div className="editor-field" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ margin: 0 }}>Perguntas ({value.items.length})</label>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleAddItem}>
              + Adicionar pergunta
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {value.items.map((item, idx) => (
              <div key={item.id} className="admin-card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <strong className="muted small">Pergunta {idx + 1}</strong>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => handleRemoveItem(item.id)}
                    style={{ padding: '0.25rem 0.5rem' }}
                  >
                    Remover
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Pergunta *
                    </label>
                    <input
                      value={item.question}
                      onChange={(e) => handleUpdateItem(item.id, { question: e.target.value })}
                      placeholder="Ex: Como funciona o atendimento?"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Resposta *
                    </label>
                    <textarea
                      value={item.answer}
                      onChange={(e) => handleUpdateItem(item.id, { answer: e.target.value })}
                      placeholder="Resposta da pergunta"
                      rows={3}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
