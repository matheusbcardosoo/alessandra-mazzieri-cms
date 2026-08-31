import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faClone,
  faEllipsis,
  faRightLeft,
  faTrash
} from '@fortawesome/free-solid-svg-icons';

export function BlockActionsDropdown({
  onDuplicate,
  onMoveColumn,
  onDelete,
  canAddSide,
  onAddSide
}: {
  onDuplicate: () => void;
  onMoveColumn: () => void;
  onDelete: () => void;
  canAddSide: boolean;
  onAddSide: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (!isOpen) return;
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const runAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="block-actions-dropdown">
      <button
        type="button"
        className="block-actions-trigger"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label="Mais ações"
        title="Mais ações"
      >
        <FontAwesomeIcon icon={faEllipsis} />
      </button>

      {isOpen && (
        <div className="block-actions-menu">
          <button type="button" onClick={() => runAction(onDuplicate)}>
            <FontAwesomeIcon icon={faClone} />
            <span>Duplicar</span>
          </button>
          {canAddSide && (
            <button type="button" onClick={() => runAction(onAddSide)}>
              <FontAwesomeIcon icon={faArrowRight} />
              <span>Adicionar ao lado</span>
            </button>
          )}
          <button type="button" onClick={() => runAction(onMoveColumn)}>
            <FontAwesomeIcon icon={faRightLeft} />
            <span>Mover coluna</span>
          </button>
          <button type="button" className="is-danger" onClick={() => runAction(onDelete)}>
            <FontAwesomeIcon icon={faTrash} />
            <span>Remover</span>
          </button>
        </div>
      )}
    </div>
  );
}
