import { parseVideoUrl } from './extensions/videoEmbed';
import type { useVideoManager } from './hooks/useVideoManager';

type Props = {
  videoManager: ReturnType<typeof useVideoManager>;
};

const platformLabel: Record<string, string> = {
  youtube: 'YouTube',
  'youtube-shorts': 'YouTube Shorts',
  tiktok: 'TikTok',
  instagram: 'Instagram'
};

export function RteVideoModal({ videoManager }: Props) {
  const { showVideoModal, setShowVideoModal, videoUrlInput, setVideoUrlInput, videoUrlError, insertVideo } = videoManager;

  if (!showVideoModal) return null;

  const preview = videoUrlInput.trim() ? parseVideoUrl(videoUrlInput) : null;

  return (
    <div className="rte-modal-backdrop" onClick={() => setShowVideoModal(false)}>
      <div className="rte-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rte-modal-header">
          <div>
            <strong>Inserir vídeo</strong>
            <p className="muted small" style={{ margin: '0.1rem 0 0' }}>
              Cole o link de um vídeo do YouTube (ou Shorts), TikTok ou Instagram Reels.
            </p>
          </div>
        </div>
        <div className="rte-modal-body">
          <div className="rte-field">
            <label>URL do vídeo *</label>
            <input
              className="rte-input"
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrlInput}
              onChange={(e) => setVideoUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  insertVideo();
                }
              }}
              autoFocus
            />
            {videoUrlError && <div className="rte-error">{videoUrlError}</div>}
            {preview && (
              <p className="muted small">
                Detectado: {platformLabel[preview.platform] ?? preview.platform} ({preview.orientation === 'vertical' ? 'vídeo vertical' : 'vídeo horizontal'})
              </p>
            )}
          </div>
        </div>
        <div className="rte-modal-footer">
          <button type="button" className="btn btn-ghost" onClick={() => setShowVideoModal(false)}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={insertVideo} disabled={!videoUrlInput.trim()}>
            Inserir
          </button>
        </div>
      </div>
    </div>
  );
}
