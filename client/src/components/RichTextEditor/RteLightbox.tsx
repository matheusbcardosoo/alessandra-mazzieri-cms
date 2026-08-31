import type { useImageManager } from './hooks/useImageManager';

type Props = {
  imageManager: ReturnType<typeof useImageManager>;
};

export function RteLightbox({ imageManager }: Props) {
  const { lightbox, setLightbox } = imageManager;

  if (!lightbox?.open) return null;

  return (
    <div className="rte-lightbox" onClick={() => setLightbox(null)}>
      <div className="rte-lightbox-content" role="dialog" aria-label="Visualizar imagem">
        <button className="rte-lightbox-close" aria-label="Fechar" onClick={() => setLightbox(null)}>
          ×
        </button>
        <div className="rte-lightbox-media">
          <img src={lightbox.src} alt={lightbox.alt} />
          {lightbox.alt && <p className="muted small" style={{ marginTop: '0.5rem', textAlign: 'center' }}>{lightbox.alt}</p>}
        </div>
      </div>
    </div>
  );
}
