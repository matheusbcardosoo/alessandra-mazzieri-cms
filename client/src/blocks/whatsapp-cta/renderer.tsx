import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { fetchSiteSettings } from '@/api/queries';
import type { SiteSettings } from '@/types';
import type { BlockRendererProps } from '../_shared/types';
import type { WhatsAppCtaBlockData } from './schema';

export function WhatsAppCtaRenderer({ data }: BlockRendererProps<WhatsAppCtaBlockData>) {
  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn: fetchSiteSettings
  });

  if (isLoading) {
    return (
      <div style={{ padding: '0.85rem 1.35rem', color: '#6b7280', fontSize: '0.9rem', border: '1px dashed #d1d5db', borderRadius: '14px', textAlign: 'center' }}>
        Carregando...
      </div>
    );
  }

  const enabled = settings?.whatsappEnabled ?? false;
  const link = settings?.whatsappLink || '';
  const message = settings?.whatsappMessage || '';
  const hideWhenDisabled = data.hideWhenDisabled || false;

  // Se desabilitado e deve ocultar, não renderiza
  if (!enabled && hideWhenDisabled) {
    return null;
  }

  // Montar URL completo com mensagem
  let fullHref = link;
  if (enabled && link && message) {
    const separator = link.includes('?') ? '&' : '?';
    fullHref = `${link}${separator}text=${encodeURIComponent(message)}`;
  }

  const label = data.label || 'Enviar mensagem no WhatsApp';
  const style = data.style || 'primary';
  const openInNewTab = data.openInNewTab !== false;
  const buttonClass = style === 'primary' ? 'btn btn-primary' : 'btn btn-outline';

  return (
    <div className="whatsapp-cta-wrapper">
      <a
        href={enabled && fullHref ? fullHref : '#'}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noreferrer' : undefined}
        className={`page-public-button ${buttonClass}`}
        style={{
          opacity: enabled ? 1 : 0.6,
          cursor: enabled ? 'pointer' : 'not-allowed',
          pointerEvents: enabled ? 'auto' : 'none'
        }}
        title={!enabled ? 'WhatsApp indisponível' : undefined}
      >
        <span className="page-button-icon"><FontAwesomeIcon icon={faWhatsapp} /></span>
        <span>{label}</span>
      </a>
    </div>
  );
}
