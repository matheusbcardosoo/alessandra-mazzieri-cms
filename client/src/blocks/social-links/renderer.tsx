import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faGlobe, faEnvelope, faLink } from '@fortawesome/free-solid-svg-icons';
import { faInstagram, faFacebook, faLinkedin, faYoutube, faTiktok, faXTwitter, faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { fetchSiteSettings } from '@/api/queries';
import type { SiteSettings, SocialLink } from '@/types';
import type { BlockRendererProps } from '../_shared/types';
import type { SocialLinksBlockData } from './schema';

const platformDescriptions: Record<string, string> = {
  instagram: 'Reflexões e conteúdo semanal',
  facebook: 'Atualidades e dicas práticas',
  linkedin: 'Artigos profissionais',
  youtube: 'Vídeos e entrevistas',
  tiktok: 'Dicas rápidas em vídeo',
  x: 'Pensamentos e notícias',
  email: 'Contato direto',
  site: 'Visite meu site'
};

export function SocialLinksRenderer({ data }: BlockRendererProps<SocialLinksBlockData>) {
  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn: fetchSiteSettings
  });

  if (isLoading) {
    return (
      <div style={{ padding: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
        Carregando redes sociais...
      </div>
    );
  }

  const socials = settings?.socials?.filter(s => s.url && s.isVisible) || [];

  if (socials.length === 0) {
    return null; // Ocultar bloco se não houver redes configuradas
  }

  const title = data.title || 'Redes Sociais';
  const variant = data.variant || 'list';
  const showIcons = data.showIcons !== false;
  const align = data.align || 'left';

  const getIconForType = (platform: string) => {
    const icons: Record<string, IconDefinition> = {
      instagram: faInstagram,
      facebook: faFacebook,
      linkedin: faLinkedin,
      youtube: faYoutube,
      tiktok: faTiktok,
      x: faXTwitter,
      site: faGlobe,
      email: faEnvelope,
      whatsapp: faWhatsapp
    };
    return icons[platform] || faLink;
  };

  const getLabelForType = (social: SocialLink): string => {
    if (social.label) return social.label;
    const labels: Record<string, string> = {
      instagram: 'Instagram',
      facebook: 'Facebook',
      linkedin: 'LinkedIn',
      youtube: 'YouTube',
      tiktok: 'TikTok',
      x: 'X (Twitter)',
      site: 'Website',
      email: 'Email',
      whatsapp: 'WhatsApp'
    };
    return labels[social.platform] || social.platform;
  };

  const getDescriptionForType = (social: SocialLink): string => {
    return social.label || platformDescriptions[social.platform] || '';
  };

  return (
    <div className="social-links-block" style={{ textAlign: align }}>
      {title && <h3 style={{ marginBottom: '1rem' }}>{title}</h3>}
      <div className={`social-links-${variant}`}>
        {socials.map((social) => {
          const description = getDescriptionForType(social);

          return (
            <a
              key={social.id}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`social-link social-link--${variant}`}
            >
              {showIcons && <span className="social-icon"><FontAwesomeIcon icon={getIconForType(social.platform)} /></span>}
              <span className="social-link-content">
                <span className="social-label">{getLabelForType(social)}</span>
                {description && <span className="social-description">{description}</span>}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
