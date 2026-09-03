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
import { faEnvelope, faLink, faPhone, faGlobe, faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { useQuery } from '@tanstack/react-query';
import { fetchNavbar } from '../api/queries';
import { DoveMark } from './BrandIcons';
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
  const socialLabels: Record<SocialLink['platform'], string> = {
    instagram: 'Instagram',
    whatsapp: 'WhatsApp',
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    x: 'X (Twitter)',
    email: 'E-mail',
    site: 'Site',
    telefone: 'Telefone',
    custom: 'Link'
  };
  const addressParts = settings?.address
    ? [settings.address.neighborhood, settings.address.city && settings.address.state ? `${settings.address.city} - ${settings.address.state}` : settings.address.city]
        .filter(Boolean)
        .join(', ')
    : '';

  return (
    <footer className="footer brand-footer">
      <div className="container footer-grid">
        <div className="footer-meta footer-brand">
          <div className="footer-brand-text">
            <div className="footer-brand-row">
              <DoveMark className="footer-brand-icon" />
              <strong className="footer-title brand-script">{siteName}</strong>
            </div>
            {settings?.metaDescription && <p className="footer-blurb">{settings.metaDescription}</p>}
            {settings?.cnpj && <div className="muted">CNPJ: {formatCnpjDisplay(settings.cnpj)}</div>}
            {settings?.professionalRegistration && <div className="muted">{settings.professionalRegistration}</div>}
          </div>
        </div>

        <div className="footer-col">
          <h4>Navegação</h4>
          {roots.map((item) => (
            <div key={item.id} className="footer-nav-group">
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

        <div className="footer-col">
          <h4>Contato</h4>
          {settings?.phone && (
            <span className="footer-contact-line">
              <FontAwesomeIcon icon={faPhone} />
              {settings.phone}
            </span>
          )}
          {settings?.contactEmail && (
            <a href={`mailto:${settings.contactEmail}`} className="footer-link footer-contact-line">
              <FontAwesomeIcon icon={faEnvelope} />
              {settings.contactEmail}
            </a>
          )}
          {socials
            // 'email' já aparece via settings.contactEmail acima — evita duplicar
            // quando o mesmo e-mail também está cadastrado nas redes sociais.
            .filter((link) => link.platform !== 'email' || !settings?.contactEmail)
            .map((link) => {
              const href = formatUrl(link);
              const isExternal = /^https?:/i.test(href);
              return (
                <a
                  key={link.id}
                  href={href}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noreferrer' : undefined}
                  className="footer-link footer-contact-line"
                >
                  <FontAwesomeIcon icon={socialIconMap[link.platform]} />
                  {link.label || socialLabels[link.platform]}
                </a>
              );
            })}
          {addressParts && (
            <span className="footer-contact-line">
              <FontAwesomeIcon icon={faLocationDot} />
              {addressParts}
            </span>
          )}
        </div>
      </div>
      <div className="footer-divider thin" />
      <div className="container footer-bottom">
        <span>
          &copy; {year} {siteName}. Todos os direitos reservados.
        </span>
      </div>
    </footer>
  );
}
