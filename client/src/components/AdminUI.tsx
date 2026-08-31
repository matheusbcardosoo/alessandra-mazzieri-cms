import { useState, type CSSProperties } from 'react';
import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faPencil, faTrash, faArrowUp, faArrowDown, faEye, faEyeSlash, faGlobe, faCopy, faUpload, faDownload, faImage } from '@fortawesome/free-solid-svg-icons';
import type { Media, NavbarItem } from '../types';
import { useHasMounted } from '../hooks/useHasMounted';
import '../public.css';
import '../admin.css';

type ModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string | number;
  /** Teto de altura do modal (qualquer unidade CSS válida). Default: 90vh. */
  maxHeight?: string | number;
};

export function Modal({ isOpen, title, description, onClose, children, footer, width = 560, maxHeight }: ModalProps) {
  const mounted = useHasMounted();
  if (!mounted || !isOpen) return null;

  const modalStyle = {
    '--modal-width': typeof width === 'number' ? `${width}px` : width,
    ...(maxHeight != null && { '--modal-max-height': typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight })
  } as CSSProperties;

  return ReactDOM.createPortal(
    <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="admin-modal" style={modalStyle}>
        <div className="admin-modal-header">
          <div className="admin-modal-heading">
            <h2 id="modal-title">{title}</h2>
            {description && (
              <>
                <span className="admin-modal-heading-sep" aria-hidden="true">·</span>
                <p className="admin-modal-description">{description}</p>
              </>
            )}
          </div>
          <button className="admin-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
        {footer && <div className="admin-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

type IconButtonProps = {
  icon: 'edit' | 'trash' | 'publish' | 'unpublish' | 'eye' | 'eye-off' | 'globe' | 'arrow-up' | 'arrow-down' | 'copy';
  onClick: () => void;
  label: string;
  tone?: 'default' | 'danger' | 'info';
  disabled?: boolean;
};

export function IconButton({ icon, onClick, label, tone = 'default', disabled }: IconButtonProps) {
  const iconMap: Record<string, IconDefinition> = {
    edit: faPencil,
    trash: faTrash,
    publish: faUpload,
    unpublish: faDownload,
    eye: faEye,
    'eye-off': faEyeSlash,
    globe: faGlobe,
    'arrow-up': faArrowUp,
    'arrow-down': faArrowDown,
    copy: faCopy
  };

  return (
    <button
      className={`icon-button tone-${tone}`}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
    >
      {iconMap[icon] && <FontAwesomeIcon icon={iconMap[icon]} />}
    </button>
  );
}

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
};

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onClose,
  loading
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} title={title} description={description} onClose={onClose} width={420}>
      <div className="admin-modal-footer">
        <button className="btn btn-outline" onClick={onClose} type="button">
          {cancelLabel}
        </button>
        <button className="btn btn-primary" onClick={onConfirm} disabled={loading} type="button">
          {loading ? 'Excluindo...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

type SwitchProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  id?: string;
};

export function Switch({ checked, onChange, label, id }: SwitchProps) {
  return (
    <label className="admin-switch" htmlFor={id}>
      {label && <span>{label}</span>}
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        type="button"
        className={`admin-switch-control ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChange(!checked);
          }
        }}
      >
        <span className="admin-switch-thumb" />
      </button>
    </label>
  );
}

type MediaGalleryProps = {
  items: Media[];
  onEdit: (media: Media) => void;
  onDelete: (media: Media) => void;
};

export function MediaGallery({ items, onEdit, onDelete }: MediaGalleryProps) {
  if (items.length === 0) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ margin: '0 auto 1.5rem', fontSize: '3rem', opacity: 0.3, color: 'var(--color-forest)' }}>
          <FontAwesomeIcon icon={faImage} />
        </div>
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-deep)' }}>Nenhuma imagem cadastrada</h3>
        <p style={{ margin: '0 0 1.5rem 0', color: 'var(--color-forest)' }}>
          Comece enviando sua primeira imagem para a biblioteca.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-gallery">
      {items.map((item) => (
        <div key={item.id} className="admin-media-card">
          <div className="admin-media-preview">
            <img src={item.url} alt={item.alt ?? ''} />
          </div>
          <div className="admin-media-meta">
            <strong style={{ color: 'var(--color-deep)' }}>{item.alt || 'Sem alt'}</strong>
          </div>
          <div className="admin-actions admin-media-actions">
            <IconButton icon="edit" label="Editar" tone="info" onClick={() => onEdit(item)} />
            <IconButton icon="trash" label="Remover" tone="danger" onClick={() => onDelete(item)} />
          </div>
        </div>
      ))}
    </div>
  );
}

type NavbarDragListProps = {
  items: NavbarItem[];
  context: 'navbar' | 'footer';
  onReorder: (items: NavbarItem[]) => void;
  onEdit: (item: NavbarItem) => void;
  onDelete: (item: NavbarItem) => void;
  onToggleVisible?: (item: NavbarItem) => void;
};

export function NavbarDragList({ items, context, onReorder, onEdit, onDelete, onToggleVisible }: NavbarDragListProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [fromIndex, setFromIndex] = useState<number | null>(null);

  const orderKey: 'orderNavbar' | 'orderFooter' = context === 'navbar' ? 'orderNavbar' : 'orderFooter';
  const sorted = [...items].sort((a, b) => (a[orderKey] ?? 0) - (b[orderKey] ?? 0));

  const formatHref = (item: NavbarItem) => {
    if (item.type === 'EXTERNAL_URL') return item.url ?? '';
    const key = item.pageKey ?? '';
    if (!key || key === 'home') return '/';
    if (key === 'blog') return '/blog';
    if (key === 'sobre' || key === 'contato') return `/${key}`;
    return key ? `/p/${key}` : '';
  };

  const reorder = (list: NavbarItem[], startIndex: number, endIndex: number) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result.map((item, index) => ({ ...item, [orderKey]: index } as NavbarItem));
  };

  return (
    <div className="admin-drag-list">
      {sorted.map((item, index) => (
        <div
          key={item.id}
          className={`admin-drag-item ${draggingId === item.id ? 'is-dragging' : ''}`}
          draggable
          onDragStart={() => {
            setDraggingId(item.id);
            setFromIndex(index);
          }}
          onDragEnd={(e) => {
            e.preventDefault();
            setDraggingId(null);
            setFromIndex(null);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (fromIndex === null) return;
            const toIndex = sorted.findIndex((i) => i.id === item.id);
            if (toIndex === -1 || toIndex === fromIndex) return;
            const next = reorder(sorted, fromIndex, toIndex);
            onReorder(next);
            setDraggingId(null);
            setFromIndex(null);
          }}
        >
          <div className="admin-drag-handle" aria-label="Mover item">::</div>
          <div className="admin-drag-content">
            <strong>{item.label}</strong>
            <span className="muted">{formatHref(item)}</span>
          </div>
          <div className="admin-actions" style={{ marginLeft: 'auto' }}>
            {onToggleVisible && (
              <IconButton
                icon={item.isVisible ? 'eye' : 'eye-off'}
                label={item.isVisible ? 'Ocultar' : 'Mostrar'}
                onClick={() => onToggleVisible(item)}
              />
            )}
            <IconButton icon="edit" label="Editar" tone="info" onClick={() => onEdit(item)} />
            <IconButton icon="trash" label="Remover" tone="danger" onClick={() => onDelete(item)} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ArticleStatusBadge({ status }: { status: 'draft' | 'published' }) {
  const isDraft = status === 'draft';
  return (
    <span
      className="admin-chip"
      style={{
        background: isDraft ? 'rgba(118,112,76,0.12)' : 'rgba(141,43,0,0.12)',
        color: isDraft ? 'var(--color-forest)' : 'var(--color-terracotta)'
      }}
    >
      {isDraft ? 'Rascunho' : 'Publicado'}
    </span>
  );
}

type NavDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function NavDrawer({ isOpen, onClose, title, children, footer }: NavDrawerProps) {
  const mounted = useHasMounted();
  if (!mounted) return null;
  return ReactDOM.createPortal(
    <>
      {/* overlay */}
      <div
        className={`nav-drawer-overlay ${isOpen ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* painel */}
      <div
        className={`nav-drawer ${isOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="nav-drawer-header">
          <h2>{title}</h2>
          <button className="admin-close" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="nav-drawer-body">{children}</div>
        {footer && <div className="nav-drawer-footer">{footer}</div>}
      </div>
    </>,
    document.body
  );
}
