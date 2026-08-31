import { ValidationInput, CharCounter } from '@/components/ValidationComponents';
import type { PageForm } from '../hooks/usePageEditor';
import { slugify } from '../hooks/usePageEditor';

export function PageSettingsPanel(_props: {
  page: PageForm;
  setPage: (updater: (prev: PageForm) => PageForm) => void;
  fieldStates: Record<string, { hasError: boolean; errorMessage?: string; isTouched: boolean }>;
  markFieldTouched: (fieldId: string) => void;
}) {
  const { page, setPage, fieldStates, markFieldTouched } = _props;

  return (
    <div className="page-settings-panel">
      <h3 className="inspector-section-title">Configurações da Página</h3>

      <div className="inspector-field">
        <label className="inspector-label">Título</label>
        <ValidationInput
          fieldId="page-title"
          hasError={fieldStates['page-title']?.hasError || false}
          errorMessage={fieldStates['page-title']?.errorMessage}
          showError={fieldStates['page-title']?.isTouched}
        >
          <input
            value={page.title}
            onChange={(e) => setPage((prev) => ({ ...prev, title: e.target.value }))}
            onBlur={() => markFieldTouched('page-title')}
            placeholder="Título da página"
          />
        </ValidationInput>
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Slug</label>
        <ValidationInput
          fieldId="page-slug"
          hasError={fieldStates['page-slug']?.hasError || false}
          errorMessage={fieldStates['page-slug']?.errorMessage}
          showError={fieldStates['page-slug']?.isTouched}
        >
          <input
            value={page.slug}
            onChange={(e) => setPage((prev) => ({ ...prev, slug: e.target.value }))}
            onBlur={(e) => {
              markFieldTouched('page-slug');
              setPage((prev) => ({ ...prev, slug: slugify(e.target.value) }));
            }}
            placeholder="ex: sobre, contato, servicos"
          />
        </ValidationInput>
        <p className="inspector-hint">
          URLs públicas ficam em /p/slug. Use letras minúsculas e hifens.
        </p>
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Descrição</label>
        <textarea
          value={page.description ?? ''}
          onChange={(e) => setPage((prev) => ({ ...prev, description: e.target.value }))}
          onBlur={() => markFieldTouched('page-description')}
          rows={3}
          placeholder="Descrição para SEO e redes sociais"
        />
        <CharCounter text={page.description || ''} limit={300} />
      </div>
    </div>
  );
}
