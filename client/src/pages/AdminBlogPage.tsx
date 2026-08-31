import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faArrowUp, faEye, faEyeSlash, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { SeoHead } from '@/components/SeoHead';
import { toast } from '@/components/toastStore';
import { ConfirmModal } from '@/components/AdminUI';
import { useAdminBlog, useUpdateBlog } from '@/hooks/queries/useBlog';
import type { BlogSection, BlogSectionType } from '@/types';

const SECTION_TYPE_ORDER: BlogSectionType[] = ['featured', 'mostViewed', 'allArticles'];

const SECTION_DEFAULTS: Record<BlogSectionType, { title: string; subtitle: string }> = {
  featured: { title: 'Em destaque', subtitle: 'Selecionados para aparecer primeiro no blog.' },
  mostViewed: { title: 'Mais vistos', subtitle: 'O que as leitoras estão consumindo agora.' },
  allArticles: { title: 'Todos os artigos', subtitle: 'Artigos mais recentes, incluindo destaques e mais vistos.' }
};

const SECTION_TYPE_LABELS: Record<BlogSectionType, string> = {
  featured: 'Em destaque',
  mostViewed: 'Mais vistos',
  allArticles: 'Todos os artigos'
};

type BlogForm = {
  id: string;
  title: string;
  description: string;
  sections: BlogSection[];
};

export function AdminBlogPage() {
  const { data, isLoading, isError, refetch } = useAdminBlog();
  const updateMutation = useUpdateBlog();
  const [form, setForm] = useState<BlogForm | null>(null);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);

  // Inicializado como `undefined` (não com `data`) para que, se a query já
  // vier resolvida no primeiro render (cache "quente" de uma visita
  // anterior), a comparação abaixo detecte a mudança e popule `form` — senão
  // `prevData` nasce igual a `data` nesse mesmo render e o bloco nunca roda,
  // deixando a página presa em "Carregando..." até um hard refresh (que zera
  // o QueryClient) forçar o carregamento assíncrono.
  const [prevData, setPrevData] = useState<typeof data>(undefined);
  if (data !== prevData) {
    setPrevData(data);
    if (data) {
      setForm({ id: data.id, title: data.title, description: data.description, sections: data.sections });
    }
  }

  if (isError) {
    return (
      <div className="admin-page">
        <SeoHead title="Blog" />
        <div className="admin-card">
          <div className="admin-empty">
            <h3>Erro ao carregar o blog</h3>
            <button className="btn btn-primary" type="button" onClick={() => refetch()}>
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !form) {
    return (
      <div className="admin-page">
        <SeoHead title="Blog" />
        <div className="admin-page-header">
          <h1 style={{ margin: 0 }}>Blog</h1>
          <p className="muted">Carregando...</p>
        </div>
      </div>
    );
  }

  const currentForm = form;
  const availableTypes = SECTION_TYPE_ORDER.filter((type) => !currentForm.sections.some((s) => s.type === type));

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= currentForm.sections.length) return;
    const next = [...currentForm.sections];
    [next[index], next[target]] = [next[target], next[index]];
    setForm({ ...currentForm, sections: next });
  };

  const toggleVisible = (index: number) => {
    const next = currentForm.sections.map((s, i) => (i === index ? { ...s, visible: !s.visible } : s));
    setForm({ ...currentForm, sections: next });
  };

  const updateSectionText = (index: number, field: 'title' | 'subtitle', value: string) => {
    const next = currentForm.sections.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    setForm({ ...currentForm, sections: next });
  };

  const addSection = (type: BlogSectionType) => {
    setForm({
      ...currentForm,
      sections: [...currentForm.sections, { type, visible: true, ...SECTION_DEFAULTS[type] }]
    });
  };

  const confirmRemove = () => {
    if (removeIndex === null) return;
    setForm({ ...currentForm, sections: currentForm.sections.filter((_, i) => i !== removeIndex) });
    setRemoveIndex(null);
  };

  const handleSave = () => {
    updateMutation.mutate(
      { id: currentForm.id, payload: { title: currentForm.title, description: currentForm.description, sections: currentForm.sections } },
      {
        onSuccess: () => toast.success('Blog salvo com sucesso'),
        onError: () => toast.error('Não foi possível salvar', { message: 'Tente novamente em instantes.' })
      }
    );
  };

  return (
    <div className="admin-page">
      <SeoHead title="Blog" />
      <div className="admin-page-header">
        <h1 style={{ margin: 0 }}>Blog</h1>
        <p className="muted">Edite o cabeçalho e organize as seções da página /blog.</p>
      </div>

      <div className="admin-card" style={{ padding: '1.5rem', display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>Cabeçalho</h3>
        <label>
          Título
          <input value={currentForm.title} onChange={(e) => setForm({ ...currentForm, title: e.target.value })} style={{ width: '100%' }} />
        </label>
        <label>
          Descrição
          <input
            value={currentForm.description}
            onChange={(e) => setForm({ ...currentForm, description: e.target.value })}
            style={{ width: '100%' }}
          />
        </label>
      </div>

      <div className="admin-card" style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Seções</h3>
        {currentForm.sections.length === 0 && <div className="admin-empty">Nenhuma seção adicionada.</div>}
        {currentForm.sections.map((section, index) => (
          <div key={section.type} className="admin-card" style={{ padding: '1rem', display: 'grid', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{SECTION_TYPE_LABELS[section.type]}</strong>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => moveSection(index, -1)}
                  disabled={index === 0}
                  aria-label={`Mover ${SECTION_TYPE_LABELS[section.type]} para cima`}
                >
                  <FontAwesomeIcon icon={faArrowUp} />
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => moveSection(index, 1)}
                  disabled={index === currentForm.sections.length - 1}
                  aria-label={`Mover ${SECTION_TYPE_LABELS[section.type]} para baixo`}
                >
                  <FontAwesomeIcon icon={faArrowDown} />
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => toggleVisible(index)}
                  aria-label={section.visible ? 'Ocultar seção' : 'Mostrar seção'}
                >
                  <FontAwesomeIcon icon={section.visible ? faEye : faEyeSlash} />
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setRemoveIndex(index)}
                  aria-label="Remover seção"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
            <label>
              Título da seção
              <input value={section.title} onChange={(e) => updateSectionText(index, 'title', e.target.value)} style={{ width: '100%' }} />
            </label>
            <label>
              Subtítulo da seção
              <input value={section.subtitle} onChange={(e) => updateSectionText(index, 'subtitle', e.target.value)} style={{ width: '100%' }} />
            </label>
          </div>
        ))}

        {availableTypes.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {availableTypes.map((type) => (
              <button key={type} type="button" className="btn btn-outline" onClick={() => addSection(type)}>
                <FontAwesomeIcon icon={faPlus} /> {SECTION_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <button className="btn btn-primary" type="button" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <ConfirmModal
        isOpen={removeIndex !== null}
        onClose={() => setRemoveIndex(null)}
        title="Remover seção"
        description="Tem certeza que deseja remover esta seção? Você pode adicioná-la de volta depois."
        onConfirm={confirmRemove}
        confirmLabel="Remover"
      />
    </div>
  );
}
