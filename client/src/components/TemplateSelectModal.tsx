import { useState } from 'react';
import { getTemplateList, type PageTemplate } from '../utils/pageTemplates';

type TemplateSelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
  loading?: boolean;
};

export function TemplateSelectModal({ isOpen, onClose, onSelect, loading }: TemplateSelectModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const templates = getTemplateList();

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '90vw' }}>
        <div className="modal-header">
          <h2>Escolher Template</h2>
          <button className="modal-close" onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem' }}>
          <p style={{ marginBottom: '1.5rem', color: 'var(--color-forest)' }}>
            Selecione um template para começar sua página com um layout pronto:
          </p>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '1rem' 
          }}>
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplate === template.id}
                onSelect={() => setSelectedTemplate(template.id)}
                disabled={loading}
              />
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-outline" 
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleConfirm}
            disabled={!selectedTemplate || loading}
          >
            {loading ? 'Criando...' : 'Criar Página'}
          </button>
        </div>
      </div>
    </div>
  );
}

type TemplateCardProps = {
  template: PageTemplate;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
};

function TemplateCard({ template, isSelected, onSelect, disabled }: TemplateCardProps) {
  return (
    <div 
      className={`template-card ${isSelected ? 'selected' : ''}`}
      onClick={disabled ? undefined : onSelect}
      style={{
        border: '2px solid',
        borderColor: isSelected ? 'var(--color-forest)' : '#e5e7eb',
        borderRadius: '12px',
        padding: '1.25rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        background: isSelected ? 'rgba(16, 185, 129, 0.05)' : '#fff',
        opacity: disabled ? 0.6 : 1
      }}
    >
      <div style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '1.125rem', 
          fontWeight: 600, 
          color: isSelected ? 'var(--color-forest)' : 'inherit' 
        }}>
          {getTemplateIcon(template.id)} {template.name}
        </h3>
      </div>
      
      <p style={{ 
        margin: 0, 
        fontSize: '0.875rem', 
        color: '#6b7280', 
        lineHeight: 1.5 
      }}>
        {template.description}
      </p>

      {isSelected && (
        <div style={{ 
          marginTop: '0.75rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          color: 'var(--color-forest)',
          fontSize: '0.875rem',
          fontWeight: 500
        }}>
          <span>✓</span>
          Selecionado
        </div>
      )}
    </div>
  );
}

function getTemplateIcon(templateId: string): string {
  switch (templateId) {
    case 'service':
      return '🏢';
    case 'about':
      return '👤';
    case 'landing':
      return '🚀';
    case 'blank':
      return '📄';
    default:
      return '📝';
  }
}