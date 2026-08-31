import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import type { useLinkManager } from './hooks/useLinkManager';

type Props = {
  linkManager: ReturnType<typeof useLinkManager>;
};

export function RteLinkPopover({ linkManager }: Props) {
  const { linkPopover, popoverRef, linkAnchorRect, popoverPlacement, arrowLeft, handleEditLink, handleRemoveLinkFromPopover } =
    linkManager;

  if (!linkPopover.open) return null;

  return createPortal(
    <div
      ref={popoverRef}
      className="rte-link-popover"
      style={{
        position: 'fixed',
        top: linkAnchorRect?.top ?? 0,
        left: linkAnchorRect?.left ?? 0,
        opacity: !linkAnchorRect ? 0 : 1,
        pointerEvents: !linkAnchorRect ? 'none' : 'auto'
      }}
    >
      <div
        className={`rte-popover-arrow ${popoverPlacement === 'bottom' ? 'is-bottom' : 'is-top'}`}
        style={{ left: arrowLeft }}
      />
      <button
        type="button"
        className="rte-popover-btn"
        aria-label="Abrir em nova aba"
        title="Abrir em nova aba"
        onClick={() => linkPopover.href && window.open(linkPopover.href, '_blank')}
        disabled={!linkPopover.href}
      >
        <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
      </button>
      <button
        type="button"
        className="rte-popover-btn tone-info"
        aria-label="Editar link"
        title="Editar link"
        onClick={handleEditLink}
      >
        <FontAwesomeIcon icon={faPen} />
      </button>
      <button
        type="button"
        className="rte-popover-btn tone-danger"
        aria-label="Remover link"
        title="Remover link"
        onClick={handleRemoveLinkFromPopover}
      >
        <FontAwesomeIcon icon={faTrash} />
      </button>
    </div>,
    document.body
  );
}
