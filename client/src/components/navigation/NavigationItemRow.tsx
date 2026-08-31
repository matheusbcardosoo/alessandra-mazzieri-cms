import { useRef, useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { NavbarItem } from '../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SyntheticListenerMap = Record<string, any>;

type NavigationItemRowProps = {
  item: NavbarItem;
  depth?: number;
  onToggleNavbar: () => void;
  onToggleFooter: () => void;
  onToggleVisible: () => void;
  onEdit: () => void;
  onDelete: () => void;
  dragListeners?: SyntheticListenerMap;
  dragAttributes?: DraggableAttributes;
  isDragging?: boolean;
};

export function NavigationItemRow({
  item,
  depth = 0,
  onToggleNavbar,
  onToggleFooter,
  onToggleVisible,
  onEdit,
  onDelete,
  dragListeners,
  dragAttributes,
  isDragging,
}: NavigationItemRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const resolveHref = () => {
    if (item.type === 'EXTERNAL_URL') return item.url ?? '';
    const key = item.pageKey ?? '';
    if (!key || key === 'home') return '/';
    if (key === 'blog') return '/blog';
    if (key === 'sobre' || key === 'contato') return `/${key}`;
    return `/p/${key}`;
  };

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div
      className={`nav-row ${depth > 0 ? 'is-child' : ''} ${isDragging ? 'is-dragging' : ''}`}
      style={{ '--nav-depth': depth } as React.CSSProperties}
    >
      {/* Drag handle */}
      <button
        className="nav-drag-handle"
        {...dragListeners}
        {...dragAttributes}
        type="button"
        aria-label="Arrastar para reordenar"
        tabIndex={0}
      >
        <FontAwesomeIcon icon={faGripVertical} />
      </button>

      {/* Indentação visual para filhos */}
      {depth > 0 && <span className="nav-indent-line" aria-hidden="true" />}

      <div className="nav-row-body">
        <div className="nav-row-title">
          <strong>{item.label}</strong>
          {!item.isVisible && <span className="nav-chip-soft muted">Oculto</span>}
        </div>
        <span className="muted small">{resolveHref()}</span>
        <div className="nav-chip-group">
          <button
            type="button"
            className={`nav-chip-toggle ${item.showInNavbar ? 'is-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleNavbar();
            }}
          >
            Navbar
          </button>
          <button
            type="button"
            className={`nav-chip-toggle ${item.showInFooter ? 'is-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFooter();
            }}
          >
            Rodapé
          </button>
          <button
            type="button"
            className={`nav-chip-toggle ${item.isVisible ? 'is-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisible();
            }}
          >
            Visível
          </button>
        </div>
      </div>

      {/* Menu de 3 pontos */}
      <div className="nav-context-menu-wrapper" ref={menuRef}>
        <button
          type="button"
          className="nav-three-dots"
          onClick={() => setMenuOpen((p) => !p)}
          aria-label="Mais ações"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <FontAwesomeIcon icon={faEllipsisVertical} />
        </button>
        {menuOpen && (
          <div className="nav-context-menu" role="menu">
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit();
              }}
            >
              Editar
            </button>
            <button
              role="menuitem"
              type="button"
              className="danger"
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
            >
              Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
