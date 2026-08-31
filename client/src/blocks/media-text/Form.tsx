import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera } from '@fortawesome/free-solid-svg-icons';
import { ImagePickerModal } from '@/components/ImagePickerModal';
import { RichTextEditor } from '@/components/RichTextEditor';
import type { MediaTextBlockData } from '@/types';
import type { BlockFormProps } from '../_shared/types';

export function MediaTextBlockForm({ value, onChange, onUploadingChange }: BlockFormProps<MediaTextBlockData>) {
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const side = value.imageSide === 'right' ? 'right' : 'left';
  const hasCustomImageWidth =
    typeof value.customImageWidthPct === 'number' &&
    Number.isFinite(value.customImageWidthPct) &&
    value.customImageWidthPct > 0;
  const imageWidth = ([25, 50, 75, 100] as const).includes(value.imageWidth as 25 | 50 | 75 | 100)
    ? (value.imageWidth as 25 | 50 | 75 | 100)
    : null;
  const customImageWidthPct =
    typeof value.customImageWidthPct === 'number' &&
    Number.isFinite(value.customImageWidthPct) &&
    value.customImageWidthPct > 0
      ? Math.round(value.customImageWidthPct)
      : '';

  const handleSelectImage = (image: { mediaId: string; src: string; alt: string; avifSrc?: string | null }) => {
    onChange({
      ...value,
      imageId: image.mediaId,
      imageUrl: image.src,
      avifSrc: image.avifSrc ?? null,
      imageAlt: image.alt || value.imageAlt || ''
    });
  };

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Texto</label>
          <RichTextEditor
            value={value.contentHtml || ''}
            onChange={(contentHtml) => onChange({ ...value, contentHtml })}
            onUploadingChange={onUploadingChange}
          />
        </div>

        <div className="editor-field">
          <label>Lado da imagem</label>
          <div className="page-columns-toggle compact">
            <button
              type="button"
              className={side === 'left' ? 'active' : ''}
              onClick={() => onChange({ ...value, imageSide: 'left' })}
            >
              Esquerda
            </button>
            <button
              type="button"
              className={side === 'right' ? 'active' : ''}
              onClick={() => onChange({ ...value, imageSide: 'right' })}
            >
              Direita
            </button>
          </div>
        </div>

        <div className="editor-field">
          <label>Largura da imagem</label>
          <div className="page-columns-toggle compact">
            {[25, 50, 75, 100].map((opt) => (
              <button
                key={`media-width-${opt}`}
                type="button"
                className={!hasCustomImageWidth && imageWidth === opt ? 'active' : ''}
                onClick={() => onChange({ ...value, imageWidth: opt as 25 | 50 | 75 | 100 })}
              >
                {opt}%
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field">
          <label>Largura personalizada (%)</label>
          <input
            type="number"
            min={1}
            max={100}
            step={1}
            value={customImageWidthPct}
            placeholder="Ex.: 42"
            onChange={(e) => {
              const next = Number(e.target.value);
              onChange({
                ...value,
                customImageWidthPct: Number.isFinite(next) && next > 0 ? Math.max(1, Math.min(Math.round(next), 100)) : null
              });
            }}
          />
        </div>

        <div className="editor-field">
          <label>Imagem</label>
          {value.imageUrl ? (
            <div className="image-selected-preview">
              <img src={value.imageUrl} alt={value.imageAlt || ''} />
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setImagePickerOpen(true)}>
                  Trocar imagem
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => onChange({ ...value, imageId: null, imageUrl: '', avifSrc: null, imageAlt: '' })}
                >
                  Remover
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-outline" onClick={() => setImagePickerOpen(true)}>
              <FontAwesomeIcon icon={faCamera} /> Selecionar imagem
            </button>
          )}
        </div>

        <div className="editor-field">
          <label>Alt da imagem</label>
          <input value={value.imageAlt ?? ''} onChange={(e) => onChange({ ...value, imageAlt: e.target.value })} />
        </div>
      </div>

      <ImagePickerModal
        open={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelect={(img) => handleSelectImage({ mediaId: img.mediaId, src: img.src, alt: img.alt, avifSrc: img.avifSrc })}
        currentMediaId={value.imageId ?? undefined}
      />
    </div>
  );
}
