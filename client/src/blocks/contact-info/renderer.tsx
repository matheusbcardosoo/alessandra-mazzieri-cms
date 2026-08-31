import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faGlobe, faEnvelope, faLink } from '@fortawesome/free-solid-svg-icons';
import { faInstagram, faFacebook, faLinkedin, faYoutube, faTiktok, faXTwitter, faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { RichText } from '@/components/RichText';
import { fetchSiteSettings } from '@/api/queries';
import type { SiteSettings, SocialLink } from '@/types';
import type { BlockRendererProps } from '../_shared/types';
import type { ContactInfoBlockData } from './schema';

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

export function ContactInfoRenderer({ data }: BlockRendererProps<ContactInfoBlockData>) {
  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn: fetchSiteSettings
  });

  if (!settings) return null;

  // Configurações do WhatsApp
  const whatsappEnabled = settings.whatsappEnabled ?? false;
  const whatsappLink = settings.whatsappLink || '';
  const whatsappMessage = settings.whatsappMessage || '';

  // Montar URL completo com mensagem
  let fullWhatsAppHref = whatsappLink;
  if (whatsappEnabled && whatsappLink && whatsappMessage) {
    const separator = whatsappLink.includes('?') ? '&' : '?';
    fullWhatsAppHref = `${whatsappLink}${separator}text=${encodeURIComponent(whatsappMessage)}`;
  }

  // Configurações das redes sociais
  const socialLinks = settings.socials?.filter(s => s.url && s.isVisible) || [];

  // Determinar classes do botão WhatsApp baseado no variant
  const whatsappVariant = data.whatsappVariant || 'primary';
  const whatsappButtonClass = whatsappVariant === 'primary' ? 'btn btn-primary' : 'btn btn-outline';

  const getLabelForSocial = (social: SocialLink): string => {
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

  const getDescriptionForSocial = (social: SocialLink): string => {
    return social.label || platformDescriptions[social.platform] || '';
  };

  const getIconForSocial = (platform: string) => {
    const iconMap: Record<string, IconDefinition> = {
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
    return iconMap[platform] || faLink;
  };

  const variant = data.socialLinksVariant || 'list';

  return (
    <div className="contact-info-block">
      {/* Título e descrição */}
      {data.titleHtml && (
        <div className="contact-info-header">
          <RichText html={data.titleHtml} />
        </div>
      )}

      {/* WhatsApp CTA */}
      {whatsappEnabled && whatsappLink && (
        <div className="contact-info-whatsapp">
          <a
            href={fullWhatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`page-public-button ${whatsappButtonClass}`}
          >
            <span className="page-button-icon"><FontAwesomeIcon icon={faWhatsapp} /></span>
            <span>{data.whatsappLabel}</span>
          </a>
        </div>
      )}

      {/* Redes Sociais */}
      {socialLinks.length > 0 && (
        <div className="contact-info-social">
          {data.socialLinksTitle && <h3 className="contact-info-social-title">{data.socialLinksTitle}</h3>}
          <div className={`social-links-${variant}`}>
            {socialLinks.map((link: SocialLink) => {
              const icon = getIconForSocial(link.platform);
              const description = getDescriptionForSocial(link);

              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`social-link social-link--${variant}`}
                >
                  <span className="social-icon"><FontAwesomeIcon icon={icon} /></span>
                  <span className="social-link-content">
                    <span className="social-label">{getLabelForSocial(link)}</span>
                    {description && <span className="social-description">{description}</span>}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
