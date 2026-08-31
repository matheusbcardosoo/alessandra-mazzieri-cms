import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchNavbar } from '../api/queries';
import type { NavbarItem, SiteSettings } from '../types';
import '../public.css';

type NavNode = NavbarItem & { children: NavbarItem[] };

const sortNavbar = (a: NavbarItem, b: NavbarItem) => (a.orderNavbar ?? 0) - (b.orderNavbar ?? 0);

const resolveHref = (item: NavbarItem) => {
  if (item.type === 'EXTERNAL_URL') return item.url ?? '#';
  const key = item.pageKey ?? '';
  if (!key || key === 'home') return '/';
  if (key === 'blog') return '/blog';
  if (key === 'sobre' || key === 'contato') return `/${key}`;
  return `/p/${key}`;
};

const buildNavTree = (items: NavbarItem[]): NavNode[] => {
  const nodes = new Map<string, NavNode>();
  items.forEach((item) => {
    nodes.set(item.id, { ...item, children: [] });
  });

  const roots: NavNode[] = [];
  items.forEach((item) => {
    const node = nodes.get(item.id);
    if (!node) return;
    if (item.parentId) {
      const parent = nodes.get(item.parentId);
      if (parent && parent.isParent) {
        parent.children.push(node);
        return;
      }
    }
    roots.push(node);
  });

  const sortNode = (list: NavNode[]) => {
    list.sort(sortNavbar);
    list.forEach((node) => sortNode(node.children as NavNode[]));
  };
  sortNode(roots);
  return roots;
};

export function Navbar({ settings }: { settings?: SiteSettings }) {
  const { data: items } = useQuery({ queryKey: ['navbar'], queryFn: fetchNavbar });
  const [scrolled, setScrolled] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null);
  const mobileCloseRef = useRef<HTMLButtonElement | null>(null);
  const wasMobileOpen = useRef(false);
  const brand = settings?.siteName || 'Site';
  const brandTagline = (settings?.brandTagline ?? '').trim();
  const showBrandTagline = brandTagline.length > 0;
  const showScheduleCta = !(settings?.hideScheduleCta ?? false);
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  const navbarItems = useMemo(
    () => (items ?? []).filter((item) => item.isVisible !== false && item.showInNavbar),
    [items]
  );
  const navTree = useMemo(() => buildNavTree(navbarItems), [navbarItems]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenId(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      requestAnimationFrame(() => {
        mobileCloseRef.current?.focus();
      });
    } else if (wasMobileOpen.current) {
      mobileToggleRef.current?.focus();
    }
    wasMobileOpen.current = mobileOpen;
  }, [mobileOpen]);

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  const overTriggerRef = useRef<string | null>(null);
  const overMenuRef = useRef<string | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openDropdown = (id: string) => {
    clearCloseTimer();
    setOpenId(id);
  };

  const scheduleCloseDropdown = (id: string) => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      const overTrigger = overTriggerRef.current === id;
      const overMenu = overMenuRef.current === id;
      setOpenId((current) => (current === id && !overTrigger && !overMenu ? null : current));
    }, 400);
  };

  useEffect(() => () => clearCloseTimer(), []);

  const renderLink = (item: NavbarItem, className = 'nav-link', onSelect?: () => void) => {
    const href = resolveHref(item);
    if (item.type === 'EXTERNAL_URL') {
      return (
        <a key={item.id} href={href} className={className} target="_blank" rel="noreferrer" onClick={onSelect}>
          {item.label}
        </a>
      );
    }
    return (
      <NavLink
        key={item.id}
        to={href}
        className={({ isActive }) => `${className} ${isActive ? 'active' : ''}`}
        onClick={onSelect}
      >
        {item.label}
      </NavLink>
    );
  };

  return (
    <header className={`nav-shell ${scrolled ? 'scrolled' : ''}`}>
      <div className="container navbar">
        <NavLink to="/" className="nav-brand">
          {settings?.logoUrl && (
            <img src={settings.logoUrl} alt={brand} className="nav-brand-logo" />
          )}
          <div className="nav-brand-text">
            <span className="nav-brand-name">{brand}</span>
            {showBrandTagline && (
              <span className="nav-brand-tagline" title={brandTagline}>
                {brandTagline}
              </span>
            )}
          </div>
        </NavLink>
        <nav className="nav-links nav-links--desktop" aria-label="Menu principal">
          {navTree.map((item) =>
            item.isParent && item.children.length ? (
              <div
                key={item.id}
                className={`nav-item dropdown ${openId === item.id ? 'is-open' : ''}`}
              >
                <div
                  className="nav-parent-row"
                  onPointerEnter={() => {
                    overTriggerRef.current = item.id;
                    openDropdown(item.id);
                  }}
                  onPointerLeave={() => {
                    if (overTriggerRef.current === item.id) overTriggerRef.current = null;
                    scheduleCloseDropdown(item.id);
                  }}
                  onFocusCapture={() => {
                    overTriggerRef.current = item.id;
                    openDropdown(item.id);
                  }}
                  onBlurCapture={(e) => {
                    if (!(e.currentTarget instanceof HTMLElement)) return;
                    const nextTarget = e.relatedTarget as Node | null;
                    if (nextTarget && e.currentTarget.contains(nextTarget)) return;
                    if (overTriggerRef.current === item.id) overTriggerRef.current = null;
                    scheduleCloseDropdown(item.id);
                  }}
                >
                  {renderLink(item, 'nav-link nav-parent')}
                  <button
                    className="nav-caret"
                    type="button"
                    aria-expanded={openId === item.id}
                    aria-label={`Alternar submenu de ${item.label}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (openId === item.id) {
                        setOpenId(null);
                      } else {
                        openDropdown(item.id);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (openId === item.id) {
                          setOpenId(null);
                        } else {
                          openDropdown(item.id);
                        }
                      }
                    }}
                  >
                    ▾
                  </button>
                </div>
                {openId === item.id && (
                  <div
                    className="nav-dropdown"
                    role="menu"
                    onPointerEnter={() => {
                      overMenuRef.current = item.id;
                      openDropdown(item.id);
                    }}
                    onPointerLeave={() => {
                      if (overMenuRef.current === item.id) overMenuRef.current = null;
                      scheduleCloseDropdown(item.id);
                    }}
                  >
                    {item.children.map((child) =>
                      renderLink(child, 'nav-link nav-dropdown-link', () => setOpenId(null))
                    )}
                  </div>
                )}
              </div>
            ) : (
              renderLink(item)
            )
          )}
          {showScheduleCta && (
            <NavLink to="/contato" className="btn btn-primary" style={{ paddingInline: '1.1rem' }}>
              Agendar
            </NavLink>
          )}
        </nav>
        <button
          ref={mobileToggleRef}
          type="button"
          className="nav-menu-toggle"
          aria-label="Abrir menu"
          aria-expanded={mobileOpen}
          aria-controls="nav-mobile-menu"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          ☰
        </button>
      </div>
      {mobileOpen && portalTarget
        ? createPortal(
            <div className="nav-mobile-overlay" onClick={closeMobileMenu}>
              <div
                id="nav-mobile-menu"
                className="nav-mobile-panel"
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                ref={mobileMenuRef}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="nav-mobile-header">
                  <div className="nav-mobile-brand">
                    <span className="nav-brand-name">{brand}</span>
                    {showBrandTagline && (
                      <span className="nav-brand-tagline nav-brand-tagline--mobile" title={brandTagline}>
                        {brandTagline}
                      </span>
                    )}
                  </div>
                  <button
                    ref={mobileCloseRef}
                    type="button"
                    className="nav-mobile-close"
                    onClick={closeMobileMenu}
                    aria-label="Fechar menu"
                  >
                    X

                  </button>
                </div>
                <div className="nav-mobile-links">
                  {navTree.map((item) => (
                    <div key={item.id} className="nav-mobile-group">
                      {renderLink(item, 'nav-mobile-link', closeMobileMenu)}
                      {item.children?.length > 0 && (
                        <div className="nav-mobile-sub">
                          {item.children.map((child) =>
                            renderLink(child, 'nav-mobile-link nav-mobile-link--child', closeMobileMenu)
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {showScheduleCta && (
                    <NavLink to="/contato" className="btn btn-primary nav-mobile-cta" onClick={closeMobileMenu}>
                      Agendar
                    </NavLink>
                  )}
                </div>
              </div>
            </div>,
            portalTarget
          )
        : null}
    </header>
  );
}
