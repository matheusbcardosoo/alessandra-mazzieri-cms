import type { RecentPostsBlockData } from '@/types';
import type { BlockFormProps } from '@/blocks/_shared/types';
import { LinkPicker } from '@/components/LinkPicker';

export function RecentPostsForm({ value, onChange }: BlockFormProps<RecentPostsBlockData>) {
  const title = value.title ?? 'Conteúdos recentes';
  const subtitle = value.subtitle ?? 'Leituras curtas para acompanhar você entre as sessões.';
  const ctaLabel = value.ctaLabel ?? 'Ver todos os artigos';
  const ctaHref = value.ctaHref ?? '/blog';
  const ctaLinkMode = value.ctaLinkMode ?? 'page';
  const postsLimit = value.postsLimit ?? 3;

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="admin-help" style={{ gridColumn: '1 / -1' }}>
          <p className="muted small">
            Esta seção exibe automaticamente os artigos mais recentes do blog.
            Configure apenas o título, subtítulo e link do botão.
          </p>
        </div>

        <div className="editor-field">
          <label>Título da seção</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            placeholder="Conteúdos recentes"
          />
        </div>

        <div className="editor-field">
          <label>Subtítulo</label>
          <textarea
            rows={2}
            value={subtitle}
            onChange={(e) => onChange({ ...value, subtitle: e.target.value })}
            placeholder="Leituras curtas para acompanhar você entre as sessões."
          />
        </div>

        <div className="editor-field">
          <label>Texto do botão</label>
          <input
            type="text"
            value={ctaLabel}
            onChange={(e) => onChange({ ...value, ctaLabel: e.target.value })}
            placeholder="Ver todos os artigos"
          />
        </div>

        <div className="editor-field">
          <label>Link do botão</label>
          <LinkPicker
            value={{
              mode: ctaLinkMode,
              href: ctaHref,
              pageId: value.ctaPageId ?? undefined,
              pageKey: value.ctaPageKey ?? undefined,
              slug: value.ctaSlug ?? undefined
            }}
            onChange={(val) =>
              onChange({
                ...value,
                ctaLinkMode: val.mode,
                ctaHref: val.href ?? '/blog',
                ctaPageId: val.pageId ?? null,
                ctaPageKey: val.pageKey ?? null,
                ctaSlug: val.slug ?? null
              })
            }
          />
        </div>

        <div className="editor-field">
          <label>Quantidade de artigos</label>
          <div className="page-columns-toggle compact">
            {[3, 6, 9].map((num) => (
              <button
                key={num}
                type="button"
                className={postsLimit === num ? 'active' : ''}
                onClick={() => onChange({ ...value, postsLimit: num })}
              >
                {num}
              </button>
            ))}
          </div>
          <small className="muted">Quantos artigos exibir (padrão: 3)</small>
        </div>
      </div>
    </div>
  );
}
