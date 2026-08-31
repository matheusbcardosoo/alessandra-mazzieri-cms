import type { useLinkManager } from './hooks/useLinkManager';

type Props = {
  linkManager: ReturnType<typeof useLinkManager>;
};

export function RteLinkModal({ linkManager }: Props) {
  const {
    showLinkModal,
    setShowLinkModal,
    linkUrl,
    setLinkUrl,
    linkText,
    setLinkText,
    linkError,
    selectedText,
    hasExistingLink,
    applyLink,
    removeLink
  } = linkManager;

  if (!showLinkModal) return null;

  return (
    <div className="rte-modal-backdrop" onClick={() => setShowLinkModal(false)}>
      <div className="rte-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rte-modal-header">
          <div>
            <strong>Inserir/Editar link</strong>
            <p className="muted small" style={{ margin: '0.1rem 0 0' }}>Use https:// ou cole uma URL completa.</p>
          </div>
        </div>
        <div className="rte-modal-body">
          <div className="rte-field">
            <label>URL *</label>
            <input
              className="rte-input"
              placeholder="https://exemplo.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyLink();
                }
              }}
              autoFocus
            />
            {linkError && <div className="rte-error">{linkError}</div>}
          </div>
          <div className="rte-field">
            <label>Texto do link (opcional)</label>
            <input
              className="rte-input"
              placeholder="Texto a ser exibido"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
            />
            {selectedText && (
              <p className="muted small">Texto selecionado: {selectedText}</p>
            )}
          </div>
        </div>
        <div className="rte-modal-footer">
          <button type="button" className="btn btn-ghost" onClick={() => setShowLinkModal(false)}>
            Cancelar
          </button>
          {hasExistingLink && (
            <button type="button" className="btn btn-outline tone-danger" onClick={removeLink}>
              Remover link
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={applyLink}>
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
