import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faInstagram,
  faWhatsapp,
  faFacebook,
  faLinkedin,
  faYoutube,
  faTiktok,
  faXTwitter
} from '@fortawesome/free-brands-svg-icons';
import { faEnvelope, faLink, faPhone, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { useQuery } from '@tanstack/react-query';
import { fetchNavbar } from '../api/queries';
import type { NavbarItem, SiteSettings, SocialLink } from '../types';

function formatCnpjDisplay(value?: string | null) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 14) return value;
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

const socialIconMap: Record<SocialLink['platform'], IconDefinition> = {
  instagram: faInstagram,
  whatsapp: faWhatsapp,
  facebook: faFacebook,
  linkedin: faLinkedin,
  youtube: faYoutube,
  tiktok: faTiktok,
  x: faXTwitter,
  email: faEnvelope,
  site: faGlobe,
  telefone: faPhone,
  custom: faLink
};

export function Footer({ settings }: { settings?: SiteSettings }) {
  const { data: navItems } = useQuery({ queryKey: ['navbar'], queryFn: fetchNavbar });
  const visibleNav = (navItems ?? [])
    .filter((item) => item.isVisible !== false && item.showInFooter)
    .sort((a, b) => (a.orderFooter ?? 0) - (b.orderFooter ?? 0));
  const socials = (settings?.socials ?? []).filter((item) => item.isVisible !== false);
  const year = new Date().getFullYear();

  const resolveHref = (item: NavbarItem) => {
    if (item.type === 'EXTERNAL_URL') return item.url ?? '#';
    const key = item.pageKey ?? '';
    if (!key || key === 'home') return '/';
    if (key === 'blog') return '/blog';
    if (key === 'sobre' || key === 'contato') return `/${key}`;
    return `/p/${key}`;
  };

  const parentMap = new Map(visibleNav.map((i) => [i.id, i]));
  const roots = visibleNav.filter((item) => {
    if (!item.parentId) return true;
    const parent = parentMap.get(item.parentId);
    return !parent || !parent.isParent;
  });
  const childrenMap = visibleNav.reduce<Record<string, NavbarItem[]>>((acc, item) => {
    if (item.parentId) {
      const parent = parentMap.get(item.parentId);
      if (parent && parent.isParent) {
        acc[item.parentId] = acc[item.parentId] || [];
        acc[item.parentId].push(item);
      }
    }
    return acc;
  }, {});
  Object.values(childrenMap).forEach((list) => list.sort((a, b) => (a.orderFooter ?? 0) - (b.orderFooter ?? 0)));

  const formatUrl = (link: SocialLink) => {
    if (link.platform === 'email') return `mailto:${link.url.replace(/^mailto:/i, '')}`;
    if (link.platform === 'whatsapp') {
      const digits = link.url.replace(/\D/g, '');
      return `https://wa.me/${digits}`;
    }
    if (link.platform === 'telefone') return `tel:${link.url.replace(/\D/g, '')}`;
    return link.url;
  };

  const siteName = settings?.siteName || 'seusite.com.br';

  return (
    <footer className="footer brand-footer">
      <div className="container footer-nav-row">
        {roots.map((item) => (
          <div key={item.id} className="footer-column">
            {item.type === 'EXTERNAL_URL' ? (
              <a href={resolveHref(item)} className="footer-link" target="_blank" rel="noreferrer">
                {item.label}
              </a>
            ) : (
              <a href={resolveHref(item)} className="footer-link">
                {item.label}
              </a>
            )}
            {(childrenMap[item.id] ?? []).length > 0 && (
              <div className="footer-sub-links">
                {childrenMap[item.id].map((child) =>
                  child.type === 'EXTERNAL_URL' ? (
                    <a key={child.id} href={resolveHref(child)} className="footer-link" target="_blank" rel="noreferrer">
                      {child.label}
                    </a>
                  ) : (
                    <a key={child.id} href={resolveHref(child)} className="footer-link">
                      {child.label}
                    </a>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="footer-divider" />
      <div className="container footer-grid">
        <div className="footer-meta footer-brand">
          <div className="footer-brand-text">
            <strong className="footer-title">{siteName}</strong>
            {settings?.cnpj && <div className="muted">CNPJ: {formatCnpjDisplay(settings.cnpj)}</div>}
            {settings?.professionalRegistration && <div className="muted">{settings.professionalRegistration}</div>}
            <div className="footer-social-list">
              {socials.map((link) => {
                const href = formatUrl(link);
                const isExternal = /^https?:/i.test(href);
                return (
                  <a
                    key={link.id}
                    href={href}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noreferrer' : undefined}
                    className="social-chip"
                    aria-label={link.label || link.platform}
                  >
                    <FontAwesomeIcon icon={socialIconMap[link.platform]} />
                  </a>
                );
              })}
              {socials.length === 0 && <span className="muted">Nenhuma rede configurada</span>}
            </div>
            {settings?.contactEmail && (
              <div className="footer-email">
                <FontAwesomeIcon icon={faEnvelope} />
                <a href={`mailto:${settings.contactEmail}`} className="footer-link">
                  {settings.contactEmail}
                </a>
              </div>
            )}
          </div>
          
        </div>
        <div className="footer-meta footer-socials">
          
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          &copy; {year} {siteName} | Todos os direitos reservados.
        </span>
      </div>
    </footer>
  );
}
