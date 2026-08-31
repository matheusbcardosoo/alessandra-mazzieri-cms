import type { useVideoManager } from './hooks/useVideoManager';

type Props = {
  videoManager: ReturnType<typeof useVideoManager>;
};

export function RteVideoEditModal({ videoManager }: Props) {
  const { editVideoModal, setEditVideoModal, applyVideoEdits } = videoManager;

  if (!editVideoModal.open) return null;

  const isLandscape = editVideoModal.orientation === 'landscape';

  return (
    <div
      className="rte-modal-backdrop"
      onPointerDown={(e) => {
        if (e.target !== e.currentTarget) return;
        setEditVideoModal((prev) => ({ ...prev, open: false }));
      }}
    >
      <div className="rte-modal" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <div className="rte-modal-header">
          <div>
            <strong>Editar vídeo</strong>
            <p className="muted small" style={{ margin: '0.1rem 0 0' }}>
              {isLandscape ? 'Ajuste o tamanho e o alinhamento.' : 'Vídeos verticais têm tamanho fixo — ajuste apenas o alinhamento.'}
            </p>
          </div>
        </div>
        <div className="rte-modal-body">
          {isLandscape && (
            <div className="rte-field">
              <label>Tamanho</label>
              <div className="rte-segmented">
                {['25', '50', '75', '100'].map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={editVideoModal.size === size ? 'active' : ''}
                    onClick={() => setEditVideoModal((prev) => ({ ...prev, size }))}
                    aria-label={`Largura ${size}%`}
                  >
                    {size}%
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="rte-field">
            <label>Alinhamento</label>
            <div className="rte-segmented">
              {['left', 'center', 'right'].map((align) => (
                <button
                  key={align}
                  type="button"
                  className={editVideoModal.align === align ? 'active' : ''}
                  onClick={() => setEditVideoModal((prev) => ({ ...prev, align }))}
                  aria-label={`Alinhar ${align}`}
                >
                  {align === 'left' ? 'Esquerda' : align === 'center' ? 'Centro' : 'Direita'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="rte-modal-footer">
          <button className="btn btn-ghost" type="button" onClick={() => setEditVideoModal((prev) => ({ ...prev, open: false }))}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={applyVideoEdits}
            disabled={editVideoModal.size === editVideoModal.baseSize && editVideoModal.align === editVideoModal.baseAlign}
          >
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}
