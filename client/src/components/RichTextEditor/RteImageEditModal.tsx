import type { useImageManager } from './hooks/useImageManager';

type Props = {
  imageManager: ReturnType<typeof useImageManager>;
};

export function RteImageEditModal({ imageManager }: Props) {
  const { editImageModal, setEditImageModal, imageAltInputRef, applyImageEdits } = imageManager;

  if (!editImageModal.open) return null;

  return (
    <div
      className="rte-modal-backdrop"
      onPointerDown={(e) => {
        if (e.target !== e.currentTarget) return;
        setEditImageModal((prev) => ({ ...prev, open: false }));
      }}
    >
      <div
        className="rte-modal rte-modal-edit-image"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rte-modal-header">
          <div>
            <strong>Editar imagem</strong>
            <p className="muted small" style={{ margin: '0.1rem 0 0' }}>Atualize alt, tamanho e alinhamento.</p>
          </div>
        </div>
        <div className="rte-modal-body rte-modal-body-scroll">
          <div className="rte-field">
            <label>Título / Alt</label>
            <input
              ref={imageAltInputRef}
              className="rte-input"
              value={editImageModal.alt}
              onChange={(e) => setEditImageModal((prev) => ({ ...prev, alt: e.target.value }))}
              placeholder="Texto alternativo (recomendado)"
              autoFocus
            />
            <p className="muted small">Ajuda na acessibilidade e SEO.</p>
          </div>
          <div className="rte-field">
            <label>Tamanho</label>
            <div className="rte-segmented">
              {['25', '50', '75', '100'].map((size) => (
                <button
                  key={size}
                  type="button"
                  className={editImageModal.size === size ? 'active' : ''}
                  onClick={() => setEditImageModal((prev) => ({ ...prev, size }))}
                  aria-label={`Largura ${size}%`}
                >
                  {size}%
                </button>
              ))}
            </div>
          </div>
          <div className="rte-field">
            <label>Alinhamento</label>
            <div className="rte-segmented">
              {['left', 'center', 'right'].map((align) => (
                <button
                  key={align}
                  type="button"
                  className={editImageModal.align === align ? 'active' : ''}
                  onClick={() => setEditImageModal((prev) => ({ ...prev, align }))}
                  aria-label={`Alinhar ${align}`}
                >
                  {align === 'left' ? 'Esquerda' : align === 'center' ? 'Centro' : 'Direita'}
                </button>
              ))}
            </div>
          </div>
          <div className="rte-field">
            <label>Preview</label>
            <div className="rte-image-preview">
              <img src={editImageModal.src} alt={editImageModal.alt} />
            </div>
          </div>
        </div>
        <div className="rte-modal-footer rte-modal-footer-sticky">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setEditImageModal((prev) => ({ ...prev, open: false }))}
          >
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={applyImageEdits}
            disabled={
              editImageModal.alt === editImageModal.baseAlt &&
              editImageModal.size === editImageModal.baseSize &&
              editImageModal.align === editImageModal.baseAlign
            }
          >
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}
