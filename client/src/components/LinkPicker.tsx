import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminPages } from '../api/queries';
import type { Page } from '../types';

export type LinkPickerValue = {
  mode: 'page' | 'manual';
  href: string;
  pageId?: string | null;
  pageKey?: string | null;
  slug?: string | null;
};

type LinkPickerProps = {
  label?: string;
  value: LinkPickerValue;
  onChange: (value: LinkPickerValue) => void;
  required?: boolean;
  helperText?: string;
};

const normalizeManual = (raw: string) => {
  const value = (raw || '').trim();
  if (!value) return '';
  if (/^(https?:\/\/|mailto:|tel:|#|\/\/)/i.test(value)) return value;
  if (/^www\./i.test(value)) return `https://${value}`;
  if (value.startsWith('/')) return value;
  return `/${value}`;
};

export function LinkPicker({ label, value, onChange, required, helperText }: LinkPickerProps) {
  const [manual, setManual] = useState(value.href ?? '');
  const mode = value.mode ?? 'manual';

  const { data: pages } = useQuery<Page[]>({
    queryKey: ['admin', 'pages', 'link-picker'],
    queryFn: () => fetchAdminPages()
  });

  const pageOptions = useMemo(
    () =>
      (pages || [])
        .filter((p) => p.pageKey !== 'home')
        .filter((p) => (p.status ? p.status === 'published' : true))
        .map((p) => ({
          id: p.id,
          label: p.title || p.slug || p.pageKey || 'Sem título',
          href: p.slug ? `/p/${p.slug}` : p.pageKey ? `/${p.pageKey}` : '/',
          pageKey: p.pageKey ?? null,
          slug: p.slug ?? null
        })),
    [pages]
  );

  const handleSelectPage = (id: string) => {
    const page = pageOptions.find((p) => p.id === id);
    if (!page) return;
    onChange({
      mode: 'page',
      href: page.href,
      pageId: page.id,
      pageKey: page.pageKey,
      slug: page.slug
    });
  };

  const handleManualChange = (raw: string) => {
    setManual(raw);
    onChange({
      mode: 'manual',
      href: normalizeManual(raw),
      pageId: null,
      pageKey: null,
      slug: null
    });
  };

  const selectedPageId =
    mode === 'page' && value.pageId
      ? value.pageId
      : mode === 'page' && value.pageKey
        ? pageOptions.find((p) => p.pageKey === value.pageKey)?.id
        : undefined;

  return (
    <div className="link-picker">
      {label && <label className="small">{label}</label>}
      <div className="page-columns-toggle compact" style={{ marginBottom: '0.5rem' }}>
        {[
          { value: 'page', label: 'Página do site' },
          { value: 'manual', label: 'Link manual' }
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={mode === opt.value ? 'active' : ''}
            onClick={() => onChange({ ...value, mode: opt.value as 'page' | 'manual' })}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {mode === 'page' ? (
        <select
          value={selectedPageId ?? ''}
          onChange={(e) => handleSelectPage(e.target.value)}
          className="form-control"
        >
          <option value="">Selecione uma página</option>
          {pageOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} — {p.href}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="form-control"
          value={manual}
          onChange={(e) => handleManualChange(e.target.value)}
          placeholder="/contato, https://..., mailto:..., #ancora"
          required={required}
        />
      )}

      <div className="muted small" style={{ marginTop: '0.35rem' }}>
        {mode === 'page'
          ? value.href
            ? `Vai para: ${value.href}`
            : 'Escolha uma página'
          : value.href
            ? `Vai para: ${value.href}`
            : 'Informe um link'}
      </div>
      {helperText && <div className="muted small">{helperText}</div>}
    </div>
  );
}
