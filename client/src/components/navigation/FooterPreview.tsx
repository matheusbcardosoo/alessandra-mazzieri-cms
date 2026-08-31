import type { NavbarItem } from '../../types';
import { IconButton } from '../AdminUI';

type FooterPreviewProps = {
  items: NavbarItem[];
  onMoveUp: (item: NavbarItem) => void;
  onMoveDown: (item: NavbarItem) => void;
  onToggleVisible: (item: NavbarItem) => void;
  onEdit: (item: NavbarItem) => void;
  onDelete: (item: NavbarItem) => void;
};

const sortFooter = (a: NavbarItem, b: NavbarItem) => (a.orderFooter ?? 0) - (b.orderFooter ?? 0);

export function FooterPreview({ items, onMoveUp, onMoveDown, onToggleVisible, onEdit, onDelete }: FooterPreviewProps) {
  const ordered = [...items].sort(sortFooter);

  return (
    <div className="footer-preview">
      {ordered.length === 0 && <div className="admin-empty">Nenhum item marcado para o rodapé.</div>}
      {ordered.length > 0 && (
        <div className="footer-preview-grid">
          {ordered.map((item, index) => {
            const disableUp = index === 0;
            const disableDown = index === ordered.length - 1;
            return (
              <div key={item.id} className="footer-card">
                <div className="footer-row">
                  <div className="nav-left-controls">
                    <div className="nav-handle" aria-label="Reordenar rodapé">
                      <div>::</div>
                    </div>
                    <div className="nav-reorder">
                      <IconButton icon="arrow-up" label="Mover para cima" onClick={() => onMoveUp(item)} disabled={disableUp} />
                      <IconButton
                        icon="arrow-down"
                        label="Mover para baixo"
                        onClick={() => onMoveDown(item)}
                        disabled={disableDown}
                      />
                    </div>
                  </div>
                  <div className="footer-row-body">
                    <div className="footer-row-title">
                      <strong>{item.label}</strong>
                      {!item.isVisible && <span className="nav-chip-soft muted">Oculto</span>}
                    </div>
                    <span className="muted small">{resolveHref(item)}</span>
                  </div>
                  <div className="nav-row-actions">
                    <IconButton
                      icon={item.isVisible ? 'eye' : 'eye-off'}
                      label={item.isVisible ? 'Ocultar' : 'Mostrar'}
                      onClick={() => onToggleVisible(item)}
                    />
                    <IconButton icon="edit" label="Editar" tone="info" onClick={() => onEdit(item)} />
                    <IconButton icon="trash" label="Excluir" tone="danger" onClick={() => onDelete(item)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function resolveHref(item: NavbarItem) {
  if (item.type === 'EXTERNAL_URL') return item.url ?? '';
  const key = item.pageKey ?? '';
  if (!key || key === 'home') return '/';
  if (key === 'blog') return '/blog';
  if (key === 'sobre' || key === 'contato') return `/${key}`;
  return `/p/${key}`;
}
