import React from 'react';
import type { ValidationError } from '../hooks/usePageValidation';

type ValidationErrorsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  errors: ValidationError[];
  onGoToError?: (error: ValidationError) => void;
};

export function ValidationErrorsModal({ isOpen, onClose, errors, onGoToError }: ValidationErrorsModalProps) {
  if (!isOpen) return null;

  const groupedErrors = errors.reduce((acc, error) => {
    const key = error.sectionId || 'page';
    if (!acc[key]) acc[key] = [];
    acc[key].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Corrija os problemas antes de publicar</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <p style={{ marginBottom: '1rem', color: '#d97706' }}>
            Encontramos alguns problemas que precisam ser corrigidos:
          </p>
          
          {Object.entries(groupedErrors).map(([sectionKey, sectionErrors]) => (
            <div key={sectionKey} style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ 
                marginBottom: '0.5rem',
                color: '#374151',
                fontSize: '1rem',
                fontWeight: 600 
              }}>
                {sectionKey === 'page' ? 'Configurações da Página' : `Seção ${sectionKey}`}
              </h4>
              
              <ul style={{ 
                margin: 0, 
                paddingLeft: '1rem',
                listStyle: 'none' 
              }}>
                {sectionErrors.map((error) => (
                  <li key={error.id} style={{ 
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ 
                      color: error.type === 'broken-image' ? '#dc2626' : '#d97706',
                      fontSize: '0.875rem'
                    }}>
                      {error.type === 'broken-image' ? '🖼️' : 
                       error.type === 'required' ? '⚠️' : '📏'}
                    </span>
                    <span style={{ fontSize: '0.875rem' }}>
                      <strong>{error.field}:</strong> {error.message}
                    </span>
                    {onGoToError && (
                      <button
                        type="button"
                        onClick={() => onGoToError(error)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          textDecoration: 'underline',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          marginLeft: 'auto'
                        }}
                      >
                        Ir para
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

type CharCounterProps = {
  text: string;
  limit?: number;
  className?: string;
};

export function CharCounter({ text, limit, className = '' }: CharCounterProps) {
  const count = text?.length || 0;
  const isOverLimit = limit && count > limit;
  
  return (
    <div className={`char-counter ${className}`} style={{
      fontSize: '0.75rem',
      color: isOverLimit ? '#dc2626' : '#6b7280',
      textAlign: 'right',
      marginTop: '0.25rem'
    }}>
      {count}{limit ? `/${limit}` : ''}
      {isOverLimit && (
        <span style={{ marginLeft: '0.5rem', color: '#dc2626' }}>
          (excedeu limite)
        </span>
      )}
    </div>
  );
}

type ValidationInputProps = {
  children: React.ReactElement<{ style?: React.CSSProperties; 'data-validation-field'?: string }>;
  fieldId: string;
  hasError: boolean;
  errorMessage?: string;
  showError?: boolean;
};

export function ValidationInput({ children, fieldId, hasError, errorMessage, showError }: ValidationInputProps) {
  const inputStyle = hasError ? {
    borderColor: '#f59e0b',
    boxShadow: '0 0 0 1px rgba(245, 158, 11, 0.2)',
    outline: 'none'
  } : {};

  return (
    <div className={hasError ? 'validation-input has-error' : 'validation-input'}>
      {React.cloneElement(children, {
        style: { ...children.props.style, ...inputStyle },
        'data-validation-field': fieldId
      })}
      {showError && hasError && errorMessage && (
        <div className="validation-error-message">
          <span>⚠️</span>
          {errorMessage}
        </div>
      )}
    </div>
  );
}

type ImageValidationBadgeProps = {
  status: 'loading' | 'valid' | 'broken';
  onReplace?: () => void;
};

export function ImageValidationBadge({ status, onReplace }: ImageValidationBadgeProps) {
  if (status === 'loading') {
    return (
      <div style={{
        position: 'absolute',
        top: '0.5rem',
        right: '0.5rem',
        background: 'rgba(59, 130, 246, 0.9)',
        color: 'white',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem'
      }}>
        <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
        Verificando...
      </div>
    );
  }

  if (status === 'broken') {
    return (
      <div style={{
        position: 'absolute',
        top: '0.5rem',
        right: '0.5rem',
        background: 'rgba(220, 38, 38, 0.9)',
        color: 'white',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span>🚫</span>
        Imagem indisponível
        {onReplace && (
          <button
            type="button"
            onClick={onReplace}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: 'white',
              padding: '0.125rem 0.25rem',
              borderRadius: '2px',
              fontSize: '0.625rem',
              cursor: 'pointer',
              marginLeft: '0.25rem'
            }}
          >
            Trocar
          </button>
        )}
      </div>
    );
  }

  return null; // Valid images don't show badge
}