import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import type { useVideoManager } from './hooks/useVideoManager';

type Props = {
  videoManager: ReturnType<typeof useVideoManager>;
};

export function RteVideoPopover({ videoManager }: Props) {
  const { videoPopover, videoMeta, videoPopoverRef, videoPlacement, videoArrowLeft, openVideoEditModal, requestRemoveVideo } = videoManager;

  if (!videoPopover.open || !videoMeta) return null;

  return createPortal(
    <div
      ref={videoPopoverRef}
      className="rte-image-popover"
      style={{
        position: 'fixed',
        top: videoPopover.rect?.y ?? 0,
        left: videoPopover.rect?.x ?? 0,
        opacity: videoPopover.rect ? 1 : 0
      }}
    >
      <div className={`rte-popover-arrow ${videoPlacement === 'bottom' ? 'is-bottom' : 'is-top'}`} style={{ left: videoArrowLeft }} />
      <button
        type="button"
        className="rte-popover-btn tone-info"
        aria-label="Editar vídeo"
        title="Editar vídeo"
        onClick={openVideoEditModal}
      >
        <FontAwesomeIcon icon={faPen} />
      </button>
      <button
        type="button"
        className="rte-popover-btn tone-danger"
        aria-label="Remover vídeo"
        title="Remover vídeo"
        onClick={requestRemoveVideo}
      >
        <FontAwesomeIcon icon={faTrash} />
      </button>
    </div>,
    document.body
  );
}
