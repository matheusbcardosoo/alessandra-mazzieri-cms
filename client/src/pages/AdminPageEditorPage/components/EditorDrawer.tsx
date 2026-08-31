import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

export function EditorDrawer({
  isOpen,
  onClose,
  children
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {isOpen && <div className="editor-drawer-overlay" onClick={onClose} />}

      <div className={`editor-drawer${isOpen ? ' is-open' : ''}`} aria-hidden={!isOpen}>
        <div className="editor-drawer-body">
          <button
            type="button"
            className="editor-drawer-close"
            onClick={onClose}
            aria-label="Fechar painel"
            title="Fechar"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
          {children}
        </div>
      </div>
    </>
  );
}
