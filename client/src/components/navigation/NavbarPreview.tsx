import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import type { NavbarItem } from '../../types';

type NavbarPreviewProps = {
  items: NavbarItem[];
  footerItems: NavbarItem[];
  siteName?: string;
};

export function NavbarPreview({ items, footerItems, siteName = 'Site' }: NavbarPreviewProps) {
  const resolveHref = (item: NavbarItem) => {
    if (item.type === 'EXTERNAL_URL') return item.url ?? '#';
    const key = item.pageKey ?? '';
    if (!key || key === 'home') return '/';
    if (key === 'blog') return '/blog';
    if (key === 'sobre' || key === 'contato') return `/${key}`;
    return `/p/${key}`;
  };

  const roots = items
    .filter((i) => i.showInNavbar && i.isVisible && i.parentId === null)
    .sort((a, b) => (a.orderNavbar ?? 0) - (b.orderNavbar ?? 0));

  const childrenOf = (id: string) =>
    items
      .filter((i) => i.parentId === id && i.isVisible)
      .sort((a, b) => (a.orderNavbar ?? 0) - (b.orderNavbar ?? 0));

  return (
    <div className="nav-preview-section">
      {/* Preview da Navbar */}
      <p className="eyebrow">Preview — Navbar</p>
      <div className="nav-preview-bar" role="presentation">
        <span className="nav-preview-brand">{siteName}</span>
        <nav className="nav-preview-links">
          {roots.map((item) => {
            const children = item.isParent ? childrenOf(item.id) : [];
            const hasChildren = children.length > 0;
            return (
              <div key={item.id} className="nav-preview-item">
                <span className="nav-preview-link">
                  {item.label}
                  {hasChildren && (
                    <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: '0.625rem', marginLeft: '0.25rem' }} />
                  )}
                </span>
                {hasChildren && (
                  <div className="nav-preview-dropdown">
                    {children.map((child) => (
                      <span
                        key={child.id}
                        className="nav-preview-dropdown-item"
                      >
                        {child.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Preview do Rodapé */}
      <p className="eyebrow" style={{ marginTop: '1.5rem' }}>
        Preview — Rodapé
      </p>
      <div className="nav-preview-footer" role="presentation">
        {footerItems.length === 0 ? (
          <span className="muted small">Nenhum item no rodapé.</span>
        ) : (
          footerItems
            .filter((i) => i.isVisible && i.showInFooter)
            .sort((a, b) => (a.orderFooter ?? 0) - (b.orderFooter ?? 0))
            .map((item) => (
              <a
                key={item.id}
                href={resolveHref(item)}
                className="nav-preview-footer-link"
                tabIndex={-1}
              >
                {item.label}
              </a>
            ))
        )}
      </div>
    </div>
  );
}
