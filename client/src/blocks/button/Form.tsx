import { Switch } from '@/components/AdminUI';
import { LinkPicker, type LinkPickerValue } from '@/components/LinkPicker';
import type { ButtonBlockData } from '@/types';
import type { BlockFormProps } from '../_shared/types';

export function ButtonBlockForm({ value, onChange }: BlockFormProps<ButtonBlockData>) {
  const linkValue: LinkPickerValue = {
    mode: value.linkMode ?? 'manual',
    href: value.href ?? '',
    pageKey: value.pageKey ?? null,
    pageId: value.pageId ?? null,
    slug: value.slug ?? null
  };
  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Texto do botão</label>
          <input value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} placeholder="Ex: Agendar sessão" />
        </div>
        <div className="editor-field">
          <LinkPicker
            label="Destino"
            value={linkValue}
            onChange={(val) =>
              onChange({
                ...value,
                href: val.href,
                linkMode: val.mode,
                pageKey: val.pageKey ?? null,
                pageId: val.pageId ?? null,
                slug: val.slug ?? null
              })
            }
          />
        </div>
        <div className="editor-field">
          <label>Estilo</label>
          <select value={value.variant ?? 'primary'} onChange={(e) => onChange({ ...value, variant: e.target.value as ButtonBlockData['variant'] })}>
            <option value="primary">Primário</option>
            <option value="secondary">Secundário</option>
            <option value="ghost">Ghost</option>
          </select>
        </div>
        <div className="editor-field">
          <Switch checked={value.newTab ?? false} onChange={(val) => onChange({ ...value, newTab: val })} label="Abrir em nova aba" />
        </div>
        <div className="editor-field">
          <label>Ícone (opcional)</label>
          <input value={value.icon ?? ''} onChange={(e) => onChange({ ...value, icon: e.target.value })} placeholder="Ex: →" />
        </div>
      </div>
    </div>
  );
}
