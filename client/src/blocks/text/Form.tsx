import { RichTextEditor } from '@/components/RichTextEditor';
import type { TextBlockData } from '@/types';
import type { BlockFormProps } from '../_shared/types';

export function TextBlockForm({ value, onChange, onUploadingChange }: BlockFormProps<TextBlockData>) {
  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Conteúdo</label>
          <RichTextEditor value={value.contentHtml} onChange={(val) => onChange({ ...value, contentHtml: val })} onUploadingChange={onUploadingChange} />
        </div>
        <div className="editor-field">
          <label>Largura</label>
          <div className="page-columns-toggle compact">
            {['normal', 'wide'].map((opt) => (
              <button
                key={opt}
                type="button"
                className={value.width === opt ? 'active' : ''}
                onClick={() => onChange({ ...value, width: opt as TextBlockData['width'] })}
              >
                {opt === 'wide' ? 'Largo' : 'Normal'}
              </button>
            ))}
          </div>
        </div>
        <div className="editor-field">
          <label>Fundo</label>
          <div className="page-columns-toggle compact">
            {['none', 'soft'].map((opt) => (
              <button
                key={opt}
                type="button"
                className={value.background === opt ? 'active' : ''}
                onClick={() => onChange({ ...value, background: opt as TextBlockData['background'] })}
              >
                {opt === 'soft' ? 'Suave' : 'Nenhum'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
