import { Suspense, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faGrip, faBars, faHome, faFileLines, faNewspaper, faImage, faClipboard, faSignOutAlt, faChevronLeft, faCog, faCircleQuestion, faUsers, faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { logout as logoutRequest } from '../api/queries';
import { AUTH_FLAG_KEY } from '../api/client';
import { useAdminTheme } from '../hooks/useAdminTheme';
import { useCurrentUser } from '../hooks/queries/useCurrentUser';
import type { SectionKey, User } from '../types';
import { ContentLoader } from './ContentLoader';
import '../public.css';
import '../admin.css';

function buildNavSections(user: User | undefined) {
  const access = user?.sectionAccess;
  const isAdmin = user?.role === 'admin';
  const has = (key: SectionKey) => isAdmin || access?.[key] === true;

  const sections: { label: string; items: { to: string; label: string; icon: string }[] }[] = [
    {
      label: 'Conteúdo',
      items: [
        { to: '/admin', label: 'Dashboard', icon: 'grid' },
        ...(has('menu') ? [{ to: '/admin/navbar', label: 'Barra de navegação', icon: 'menu' }] : []),
        ...(isAdmin || user?.canAccessHome ? [{ to: '/admin/home', label: 'Página inicial', icon: 'home' }] : []),
        ...(has('blog') ? [{ to: '/admin/blog', label: 'Blog', icon: 'article' }] : []),
        { to: '/admin/pages', label: 'Páginas', icon: 'pages' },
        ...(has('blog') ? [{ to: '/admin/articles', label: 'Artigos', icon: 'article' }] : []),
        ...(has('settings') ? [{ to: '/admin/settings', label: 'Configurações do Site', icon: 'settings' }] : [])
      ]
    },
    ...(has('forms')
      ? [{ label: 'Formulários', items: [{ to: '/admin/form-submissions', label: 'Respostas dos formulários', icon: 'clipboard' }] }]
      : []),
    ...(has('media') ? [{ label: 'Mídia', items: [{ to: '/admin/media', label: 'Imagens', icon: 'image' }] }] : []),
    ...(isAdmin || user?.role === 'owner'
      ? [
          {
            label: 'Equipe',
            items: [
              { to: '/admin/usuarios', label: 'Usuários', icon: 'users' },
              { to: '/admin/auditoria', label: 'Log de auditoria', icon: 'audit' }
            ]
          }
        ]
      : []),
    { label: 'Suporte', items: [{ to: '/admin/ajuda', label: 'Ajuda', icon: 'help' }] }
  ];

  return sections;
}

const pageTitles: Record<string, string> = {
  '/admin': 'Painel',
  '/admin/navbar': 'Navbar',
  '/admin/home': 'Home',
  '/admin/blog': 'Blog',
  '/admin/pages': 'Páginas',
  '/admin/articles': 'Artigos',
  '/admin/media': 'Mídia',
  '/admin/form-submissions': 'Respostas dos Formulários',
  '/admin/settings': 'Configurações',
  '/admin/usuarios': 'Usuários',
  '/admin/auditoria': 'Log de Auditoria',
  '/admin/ajuda': 'Ajuda'
};

function Icon({ name }: { name: string }) {
  const iconMap: Record<string, IconDefinition> = {
    grid: faGrip,
    menu: faBars,
    home: faHome,
    pages: faFileLines,
    article: faNewspaper,
    image: faImage,
    clipboard: faClipboard,
    logout: faSignOutAlt,
    'chevron-left': faChevronLeft,
    settings: faCog,
    help: faCircleQuestion,
    users: faUsers,
    audit: faClockRotateLeft
  };

  const icon = iconMap[name];
  return icon ? <FontAwesomeIcon icon={icon} className="admin-icon" /> : null;
}

type AdminTopbarProps = {
  title: string;
  siteUrl: string;
};

function AdminTopbar({ title, siteUrl }: AdminTopbarProps) {
  return (
    <header className="admin-topbar">
      <div className="admin-crumb">
        <div className="admin-page-label">
          <small>Painel</small>
          <strong>{title}</strong>
        </div>
      </div>
      <div className="admin-actions">
        <a className="btn btn-outline" href={siteUrl} target="_blank" rel="noreferrer">
          Visualizar site
        </a>
      </div>
    </header>
  );
}

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const { siteName, initials, themeCssVars, isLoading } = useAdminTheme();
  const { data: currentUser } = useCurrentUser();
  const navSections = useMemo(() => buildNavSections(currentUser), [currentUser]);

  const logout = async () => {
    try {
      await logoutRequest();
    } finally {
      // Limpa o cache do React Query junto com a flag local — sem isso,
      // fazer login com outra conta na mesma aba pode mostrar permissões
      // (sidebar, RequireRole) da conta anterior por até staleTime.
      queryClient.clear();
      localStorage.removeItem(AUTH_FLAG_KEY);
      navigate('/admin/login');
    }
  };

  const siteUrl =
    import.meta.env.VITE_PUBLIC_URL ||
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_PUBLIC_SITE_URL ||
    import.meta.env.VITE_APP_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  const title = useMemo(() => {
    if (location.pathname.startsWith('/admin/ajuda/')) return 'Ajuda';
    return pageTitles[location.pathname] ?? 'Painel';
  }, [location.pathname]);

  // Aplicar tema como inline styles para o shell do admin
  const adminShellStyle = useMemo(
    () => (isLoading ? {} : (themeCssVars as CSSProperties)),
    [themeCssVars, isLoading]
  );

  useEffect(() => {
    if (isLoading) return undefined;

    const previousValues = new Map<string, string>();
    const bodyStyle = document.body.style;

    Object.entries(themeCssVars).forEach(([key, value]) => {
      previousValues.set(key, bodyStyle.getPropertyValue(key));
      bodyStyle.setProperty(key, value);
    });

    return () => {
      previousValues.forEach((value, key) => {
        if (value) {
          bodyStyle.setProperty(key, value);
        } else {
          bodyStyle.removeProperty(key);
        }
      });
    };
  }, [themeCssVars, isLoading]);

  return (
    <div className={`admin-shell ${collapsed ? 'is-collapsed' : ''}`} style={adminShellStyle}>
      <aside className="admin-sidebar">
        <div className="admin-logo-row">
          <div className="admin-logo">
            <span className="admin-logo-badge" title={siteName}>
              {initials || 'AD'}
            </span>
            <span title={siteName}>{siteName}</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setCollapsed((c) => !c)} aria-label="Expandir/colapsar menu">
            <Icon name="chevron-left" />
          </button>
        </div>
        <nav className="admin-nav">
          {navSections.map((section) => (
            <div key={section.label} className="admin-nav-section">
              <span className="admin-nav-label">{section.label}</span>
              <div className="admin-nav-list">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/admin'}
                    className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <button onClick={logout} className="btn btn-outline admin-logout" style={{ width: '100%' }}>
          <Icon name="logout" /> <span>Sair</span>
        </button>
      </aside>
      <div className="admin-main">
        <AdminTopbar title={title} siteUrl={siteUrl} />
        <div className="admin-content">
          <Suspense fallback={<ContentLoader message="Carregando..." />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
