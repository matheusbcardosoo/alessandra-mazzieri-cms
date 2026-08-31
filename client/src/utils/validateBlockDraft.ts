import type {
  TextBlockData,
  ImageBlockData,
  ButtonBlockData,
  CardBlockData,
  CtaBlockData,
  FormBlockData,
  HeroBlockData,
  HeroBlockDataV1,
  HeroMediaMode,
  MediaTextBlockData,
  ServicesBlockData
} from '../types';
import { isHeroV1 } from './heroMigration';
import type { BlockDraft } from '../pages/AdminPageEditorPage/hooks/useBlockManager';

const plainTextLength = (html: string) =>
  html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length;

// Fallback for V1 hero validation (registry hero default is V2 — different schema)
const heroV1FallbackFourCards = {
  medium: { title: 'Sessão', text: 'Texto', icon: null, imageId: null, url: null, alt: null },
  small: [
    { title: 'Equilíbrio emocional', text: 'Ferramentas práticas para o dia a dia.', icon: null, imageId: null, url: null, alt: null },
    { title: 'Relações saudáveis', text: 'Comunicação e limites claros.', icon: null, imageId: null, url: null, alt: null },
    { title: 'Autoconhecimento', text: 'Reconectar-se com quem você é.', icon: null, imageId: null, url: null, alt: null }
  ]
};

const isValidUrl = (url: string): boolean => {
  const trimmed = url.trim();
  return (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith('/') ||
    /^mailto:/i.test(trimmed) ||
    /^tel:/i.test(trimmed) ||
    trimmed.startsWith('#') ||
    /^https?:\/\/wa\.me/i.test(trimmed) ||
    /^wa\.me/i.test(trimmed) ||
    /^\/\//.test(trimmed)
  );
};

/**
 * Validates a block draft and returns an error message if invalid, or null if valid
 */
export function validateBlockDraft(draft: BlockDraft | null): string | null {
  if (!draft) {
    return 'Escolha um tipo de bloco.';
  }

  const { type, data } = draft;

  // Text block validation
  if (type === 'text') {
    const content = (data as TextBlockData).contentHtml || '';
    if (!plainTextLength(content)) {
      return 'Preencha o conteúdo do texto.';
    }
  }

  // Image block validation
  if (type === 'image') {
    const imageData = data as ImageBlockData;
    if (!imageData.src) {
      return 'Selecione ou envie uma imagem.';
    }
  }

  // Button block validation
  if (type === 'button') {
    const buttonData = data as ButtonBlockData;
    if (!buttonData.label.trim()) {
      return 'Informe o texto do botão.';
    }
    if (!isValidUrl(buttonData.href)) {
      return 'Use http(s), mailto, tel, #ancora ou um caminho iniciando com /.';
    }
  }

  // CTA block validation
  if (type === 'cta') {
    const ctaData = data as CtaBlockData;
    if (!ctaData.title?.trim()) {
      return 'Informe o título do CTA.';
    }
    if (!ctaData.ctaLabel?.trim()) {
      return 'Informe o texto do botão do CTA.';
    }
    if (!isValidUrl(ctaData.ctaHref ?? '')) {
      return 'Use http(s), mailto, tel, #ancora ou um caminho iniciando com /.';
    }
  }

  // Cards block validation
  if (type === 'cards') {
    const cardsData = data as CardBlockData;
    if (cardsData.items.length === 0) {
      return 'Adicione pelo menos um card.';
    }
    for (const item of cardsData.items) {
      if (!item.title.trim() || !item.text.trim()) {
        return 'Todos os cards devem ter título e texto.';
      }
      if (item.ctaHref && !/^https?:\/\//i.test(item.ctaHref.trim())) {
        return 'URLs de CTA devem iniciar com http(s).';
      }
    }
  }

  // Services block validation
  if (type === 'services') {
    const servicesData = data as ServicesBlockData;
    if (!servicesData.sectionTitle?.trim()) {
      return 'Informe o título da seção de serviços.';
    }
    if (!servicesData.items || servicesData.items.length === 0) {
      return 'Adicione pelo menos um serviço.';
    }
    for (const item of servicesData.items) {
      if (!item.title.trim() || !item.href.trim()) {
        return 'Todos os serviços precisam de título e link.';
      }
    }
  }

  // Form block validation
  if (type === 'form') {
    const formData = data as FormBlockData;
    if (formData.fields.length === 0) {
      return 'Adicione pelo menos um campo ao formulário.';
    }
    for (const field of formData.fields) {
      if (!field.label.trim()) {
        return 'Todos os campos devem ter um rótulo.';
      }
      if (field.type === 'select' && (!field.options || field.options.length === 0)) {
        return 'Campos do tipo "select" devem ter opções.';
      }
    }
  }

  // Hero block validation
  if (type === 'hero') {
    const heroData = data as HeroBlockData;
    if (isHeroV1(heroData)) {
      const mode: HeroMediaMode = ((heroData as HeroBlockDataV1).mediaMode as HeroMediaMode) ?? 'four_cards';
      if (mode === 'single_image' && !(heroData as HeroBlockDataV1).singleImage?.url) {
        return 'Selecione uma imagem para o modo "Somente imagem".';
      }
      if (mode === 'four_cards' || mode === 'cards_only') {
        const fc = (heroData as HeroBlockDataV1).fourCards ?? heroV1FallbackFourCards;
        if (!fc.medium.title?.trim() || !fc.medium.text?.trim()) {
          return 'O card médio precisa de título e texto.';
        }
        const small = fc.small ?? heroV1FallbackFourCards.small;
        if (small.some((c: { title?: string; text?: string }) => !c.title?.trim() || !c.text?.trim())) {
          return 'Todos os 3 cards pequenos precisam de título e texto.';
        }
      }
    }
  }

  // Media-Text block validation
  if (type === 'media-text') {
    const mediaTextData = data as MediaTextBlockData;
    const plain = (mediaTextData.contentHtml || '').replace(/<[^>]+>/g, '').trim();
    if (!mediaTextData.imageUrl?.trim()) {
      return 'Selecione uma imagem para o bloco imagem + texto.';
    }
    if (!plain) {
      return 'Adicione texto no bloco imagem + texto.';
    }
  }

  return null;
}
