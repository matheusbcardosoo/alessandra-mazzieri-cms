import type { useImageManager } from './hooks/useImageManager';

type Props = {
  imageManager: ReturnType<typeof useImageManager>;
  captureSelection: () => void;
};

export function RteImageModal({ imageManager, captureSelection }: Props) {
  const {
    showImageModal,
    setShowImageModal,
    media,
    activeTab,
    setActiveTab,
    search,
    setSearch,
    uploadError,
    uploadAlt,
    setUploadAlt,
    handleSelectFromLibrary,
    handleUploadNow
  } = imageManager;

  if (!showImageModal) return null;

  return (
    <div className="rte-modal-backdrop" onClick={() => setShowImageModal(false)}>
      <div className="rte-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rte-modal-tabs">
          <button className={activeTab === 'library' ? 'active' : ''} onClick={() => setActiveTab('library')}>
            Biblioteca
          </button>
          <button className={activeTab === 'upload' ? 'active' : ''} onClick={() => setActiveTab('upload')}>
            Enviar agora
          </button>
        </div>
        {activeTab === 'library' && (
          <div className="rte-library">
            <input
              placeholder="Buscar por alt"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginBottom: '0.5rem' }}
            />
            <div className="rte-library-grid">
              {media
                .filter((m) => (m.alt ?? '').toLowerCase().includes(search.toLowerCase()))
                .map((m) => (
                  <button key={m.id} type="button" className="rte-media-card" onClick={() => handleSelectFromLibrary(m)}>
                    <img src={m.url} alt={m.alt ?? m.id} />
                    <span className="muted small">{m.alt || 'Sem alt'}</span>
                  </button>
                ))}
              {media.length === 0 && <div className="muted">Nenhuma mídia encontrada.</div>}
            </div>
          </div>
        )}
        {activeTab === 'upload' && (
          <div className="rte-upload">
            <div className="rte-field">
              <label>Texto alternativo da imagem</label>
              <input
                className="rte-input"
                placeholder="Descreva a imagem para acessibilidade"
                value={uploadAlt}
                onChange={(e) => setUploadAlt(e.target.value)}
              />
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  captureSelection();
                  handleUploadNow(file, uploadAlt);
                  setUploadAlt('');
                  e.target.value = '';
                }
              }}
            />
            {uploadError && <div className="admin-empty" role="alert">{uploadError}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
