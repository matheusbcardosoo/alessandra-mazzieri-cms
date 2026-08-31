import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import type { useImageManager } from './hooks/useImageManager';

type Props = {
  imageManager: ReturnType<typeof useImageManager>;
};

export function RteImagePopover({ imageManager }: Props) {
  const { imagePopover, imageMeta, imagePopoverRef, imagePlacement, imageArrowLeft, openImageLightbox, openImageEditModal, requestRemoveImage } =
    imageManager;

  if (!imagePopover.open || !imageMeta) return null;

  return createPortal(
    <div
      ref={imagePopoverRef}
      className="rte-image-popover"
      style={{
        position: 'fixed',
        top: imagePopover.rect?.y ?? 0,
        left: imagePopover.rect?.x ?? 0,
        opacity: imagePopover.rect ? 1 : 0
      }}
    >
      <div
        className={`rte-popover-arrow ${imagePlacement === 'bottom' ? 'is-bottom' : 'is-top'}`}
        style={{ left: imageArrowLeft }}
      />
      <button
        type="button"
        className="rte-popover-btn"
        aria-label="Visualizar imagem"
        title="Visualizar imagem"
        onClick={openImageLightbox}
      >
        <FontAwesomeIcon icon={faEye} />
      </button>
      <button
        type="button"
        className="rte-popover-btn tone-info"
        aria-label="Editar imagem"
        title="Editar imagem"
        onClick={openImageEditModal}
      >
        <FontAwesomeIcon icon={faPen} />
      </button>
      <button
        type="button"
        className="rte-popover-btn tone-danger"
        aria-label="Remover imagem"
        title="Remover imagem"
        onClick={requestRemoveImage}
      >
        <FontAwesomeIcon icon={faTrash} />
      </button>
    </div>,
    document.body
  );
}
