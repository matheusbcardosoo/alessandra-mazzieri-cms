import { useState, type CSSProperties, type FormEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { submitForm } from '@/api/queries';
import type { BlockRendererProps } from '../_shared/types';
import type { FormBlockData } from './schema';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

function resolvePageSlugFromLocation(): string {
  const path = window.location.pathname;
  if (path === '/' || path === '/home') return 'home';
  const match = path.match(/^\/p\/([^/]+)/);
  if (match) return match[1];
  const parts = path.split('/').filter(Boolean);
  return parts[0] || 'home';
}

export function FormRenderer({ data: formData, blockId, enableFormSubmit = true, pageSlug }: BlockRendererProps<FormBlockData>) {
  const [state, setState] = useState<FormState>('idle');
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [honeypot, setHoneypot] = useState<string>(''); // Anti-spam field

  // Cor do texto (título/descrição/rótulos) e do botão: 'default' = cores do tema; 'custom' = cor escolhida.
  const formStyle: CSSProperties = {
    ...(formData.textColorMode === 'custom' && formData.textColor ? { '--form-text-color': formData.textColor } : {}),
    ...(formData.buttonColorMode === 'custom' && formData.buttonColor
      ? { '--form-button-bg': formData.buttonColor, '--form-button-bg-hover': formData.buttonColor }
      : {})
  } as CSSProperties;

  const validateField = (field: FormBlockData['fields'][0], value: string): string | null => {
    if (field.required && !value.trim()) {
      return 'Este campo é obrigatório';
    }

    if (value.trim() && field.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'E-mail inválido';
      }
    }

    if (value.trim() && field.type === 'tel') {
      const phoneRegex = /^[\d\s()+-]+$/;
      if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 8) {
        return 'Telefone inválido';
      }
    }

    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Se submissão desabilitada (modo preview), não fazer nada
    if (!enableFormSubmit) {
      return;
    }

    // Anti-spam: se honeypot preenchido, ignore silenciosamente
    if (honeypot) {
      setState('success');
      return;
    }

    // Validar todos os campos
    const newErrors: Record<string, string> = {};
    for (const field of formData.fields) {
      const value = values[field.id] || '';
      const error = validateField(field, value);
      if (error) {
        newErrors[field.id] = error;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Focar no primeiro campo com erro
      const firstErrorId = Object.keys(newErrors)[0];
      const firstErrorElement = document.getElementById(`field-${firstErrorId}`);
      firstErrorElement?.focus();
      return;
    }

    setState('submitting');
    setErrors({});
    setErrorMessage('');

    try {
      // Submeter via API centralizada
      const resolvedSlug = pageSlug || resolvePageSlugFromLocation();
      await submitForm({
        pageSlug: resolvedSlug,
        formBlockId: blockId ?? 'unknown',
        formData: values,
        honeypot: honeypot || undefined
      });

      setState('success');
      setValues({}); // Limpar campos após sucesso
    } catch (error) {
      setState('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Erro ao enviar formulário. Tente novamente.'
      );
    }
  };

  const handleChange = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    // Limpar erro do campo ao digitar
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  // Se já foi enviado com sucesso, mostrar apenas mensagem
  if (state === 'success') {
    return (
      <div className="page-public-form form-success" style={formStyle}>
        <div className="form-success-message">
          <span className="form-success-icon"><FontAwesomeIcon icon={faCheck} /></span>
          <p>{formData.successMessage || 'Mensagem enviada com sucesso!'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-public-form" style={formStyle}>
      {formData.title && <h2 className="form-title">{formData.title}</h2>}
      {formData.description && <p className="form-description">{formData.description}</p>}

      <form onSubmit={handleSubmit} noValidate>
        {/* Honeypot field - hidden from users */}
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <div className="form-fields">
          {formData.fields.map((field) => {
            const value = values[field.id] || '';
            const error = errors[field.id];
            const fieldId = `field-${field.id}`;

            return (
              <div key={field.id} className={`form-field ${error ? 'has-error' : ''}`.trim()}>
                <label htmlFor={fieldId}>
                  {field.label}
                  {field.required && <span className="required-mark" aria-label="obrigatório"> *</span>}
                </label>

                {field.type === 'textarea' ? (
                  <textarea
                    id={fieldId}
                    name={field.id}
                    value={value}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    placeholder={field.placeholder || undefined}
                    required={field.required}
                    rows={4}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${fieldId}-error` : undefined}
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={fieldId}
                    name={field.id}
                    value={value}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    required={field.required}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${fieldId}-error` : undefined}
                  >
                    <option value="">Selecione...</option>
                    {(field.options || []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={fieldId}
                    type={field.type}
                    name={field.id}
                    value={value}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    placeholder={field.placeholder || undefined}
                    required={field.required}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${fieldId}-error` : undefined}
                  />
                )}

                {error && (
                  <span id={`${fieldId}-error`} className="form-field-error" role="alert">
                    {error}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {state === 'error' && errorMessage && (
          <div className="form-error-message" role="alert">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary form-submit"
          disabled={state === 'submitting'}
        >
          {state === 'submitting' ? (
            <>
              <span className="spinner" aria-hidden="true"></span>
              <span>Enviando...</span>
            </>
          ) : (
            formData.submitLabel || 'Enviar'
          )}
        </button>
      </form>
    </div>
  );
}
