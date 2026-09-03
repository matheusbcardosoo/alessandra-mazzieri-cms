import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { fetchNavbar } from '../api/queries';
import { Icon } from './Icon';
import { DoveMark } from './BrandIcons';
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

// Um link "externo" que na verdade é uma âncora da própria página (ex.: "/#sobre")
// não deve abrir em nova aba nem recarregar a página quando o destino já está
// presente no DOM — apenas rolar suavemente até a seção.
const isAnchorLink = (href: string) => href.startsWith('#') || href.startsWith('/#');

const scrollToAnchor = (href: string, event: MouseEvent) => {
  const id = href.split('#')[1];
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return; // não estamos na Home: deixa o navegador seguir o link normalmente
  event.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null);
  const brand = settings?.siteName || 'Site';
  const brandTagline = (settings?.brandTagline ?? '').trim();
  const showBrandTagline = brandTagline.length > 0;
  const showScheduleCta = !(settings?.hideScheduleCta ?? false);
  const whatsappEnabled = settings?.whatsappEnabled ?? false;
  const whatsappHref = whatsappEnabled && settings?.whatsappLink
    ? (() => {
        const link = settings.whatsappLink as string;
        const message = (settings.whatsappMessage ?? '').trim();
        const base = /^https?:\/\//i.test(link) ? link : `https://wa.me/${link.replace(/\D/g, '')}`;
        return message ? `${base}${base.includes('?') ? '&' : '?'}text=${encodeURIComponent(message)}` : base;
      })()
    : null;

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
      if (isAnchorLink(href)) {
        return (
          <a
            key={item.id}
            href={href}
            className={className}
            onClick={(event) => {
              scrollToAnchor(href, event);
              onSelect?.();
            }}
          >
            {item.label}
          </a>
        );
      }
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
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt={brand} className="nav-brand-logo" />
          ) : (
            <DoveMark className="nav-brand-icon" />
          )}
          <div className="nav-brand-text">
            <span className="nav-brand-name brand-script">{brand}</span>
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
                    <FontAwesomeIcon icon={faChevronDown} />
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
        </nav>
        <div className="nav-cta">
          {showScheduleCta && (
            whatsappHref ? (
              <a href={whatsappHref} className="btn btn-outline" target="_blank" rel="noreferrer">
                <span>Falar com Terapeuta</span>
                <Icon name="whatsapp" />
              </a>
            ) : (
              <NavLink to="/contato" className="btn btn-primary" style={{ paddingInline: '1.1rem' }}>
                Agendar
              </NavLink>
            )
          )}
          <button
            ref={mobileToggleRef}
            type="button"
            className="nav-menu-toggle"
            aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileOpen}
            aria-controls="nav-mobile-menu"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <span className="nav-hamburger">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>
      <div id="nav-mobile-menu" className={`nav-mobile-menu ${mobileOpen ? 'open' : ''}`}>
        {navTree.map((item, index) => (
          <div key={item.id} className="nav-mobile-menu-item" style={{ '--i': index } as CSSProperties}>
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
          <div className="nav-mobile-menu-item nav-mobile-menu-item--cta" style={{ '--i': navTree.length } as CSSProperties}>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                className="btn btn-primary nav-mobile-cta"
                target="_blank"
                rel="noreferrer"
                onClick={closeMobileMenu}
              >
                <span>Falar com Terapeuta</span>
                <Icon name="whatsapp" />
              </a>
            ) : (
              <NavLink to="/contato" className="btn btn-primary nav-mobile-cta" onClick={closeMobileMenu}>
                Agendar
              </NavLink>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
