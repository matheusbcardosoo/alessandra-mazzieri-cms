import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareNodes } from '@fortawesome/free-solid-svg-icons';
import { faFacebook, faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { toast } from './toastStore';

type ShareButtonsProps = {
  // URL absoluta a compartilhar. Se omitida, usa a página atual (window.location.href).
  url?: string;
  title: string;
  text?: string;
};

function openSharePopup(shareUrl: string) {
  window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
}

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  } catch {
    toast.error('Não foi possível copiar o link.');
  }
}

/**
 * Botões de compartilhamento genéricos (Facebook, WhatsApp e um botão
 * "mais opções"). Reutilizável para qualquer conteúdo com título/URL, não
 * só artigos.
 *
 * O Instagram não tem link público de compartilhamento como o Facebook e o
 * WhatsApp — Stories e DM só são acessíveis pelo share sheet nativo do
 * sistema operacional. Por isso o terceiro botão usa a Web Share API
 * (`navigator.share`) quando disponível: no celular ela abre o menu nativo
 * de compartilhamento, que já inclui o Instagram (e qualquer outro app
 * instalado). Sem suporte — a maioria dos navegadores desktop — cai para
 * copiar o link, que também é o resultado se o usuário fechar o share
 * sheet sem escolher nada além de cancelar.
 */
export function ShareButtons({ url, title, text }: ShareButtonsProps) {
  const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '');

  const handleFacebookShare = () => {
    if (!shareUrl) return;
    openSharePopup(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
  };

  const handleWhatsappShare = () => {
    if (!shareUrl) return;
    const message = `${text ?? title} ${shareUrl}`;
    openSharePopup(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  const handleMoreShare = async () => {
    if (!shareUrl) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return; // usuário cancelou
        await copyLink(shareUrl);
      }
      return;
    }
    await copyLink(shareUrl);
  };

  return (
    <div className="share-buttons" role="group" aria-label="Compartilhar">
      <button
        type="button"
        className="share-pill share-pill--facebook"
        onClick={handleFacebookShare}
        aria-label="Compartilhar no Facebook"
        title="Compartilhar no Facebook"
      >
        <FontAwesomeIcon icon={faFacebook} />
      </button>
      <button
        type="button"
        className="share-pill share-pill--whatsapp"
        onClick={handleWhatsappShare}
        aria-label="Compartilhar no WhatsApp"
        title="Compartilhar no WhatsApp"
      >
        <FontAwesomeIcon icon={faWhatsapp} />
      </button>
      <button
        type="button"
        className="share-pill share-pill--more"
        onClick={handleMoreShare}
        aria-label="Mais opções de compartilhamento"
        title="Mais opções de compartilhamento"
      >
        <FontAwesomeIcon icon={faShareNodes} />
      </button>
    </div>
  );
}
