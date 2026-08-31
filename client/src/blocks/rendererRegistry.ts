import type React from 'react';
import type { BlockType } from '@/types';
import type { BlockRendererProps } from './_shared/types';

import { TextRenderer } from './text/renderer';
import { ImageRenderer } from './image/renderer';
import { ButtonRenderer } from './button/renderer';
import { SpanRenderer } from './span/renderer';
import { PillsRenderer } from './pills/renderer';
import { ButtonGroupRenderer } from './button-group/renderer';
import { CtaRenderer } from './cta/renderer';
import { MediaTextRenderer } from './media-text/renderer';
import { CardsRenderer } from './cards/renderer';
import { FormRenderer } from './form/renderer';
import { HeroRenderer } from './hero/renderer';
import { RecentPostsRenderer } from './recent-posts/renderer';
import { SocialLinksRenderer } from './social-links/renderer';
import { WhatsAppCtaRenderer } from './whatsapp-cta/renderer';
import { ContactInfoRenderer } from './contact-info/renderer';
import { ServicesRenderer } from './services/renderer';

export type RendererConfig = {
  renderer: React.ComponentType<BlockRendererProps<unknown>>;
};

/**
 * Só os renderers — usado por PageRenderer.tsx (páginas públicas + preview
 * do admin), que nunca precisa dos componentes de edição (`Form`).
 *
 * Por quê isso existe separado de blocks/registry.ts: o registry completo
 * importa também o `Form` de cada bloco, e alguns Forms (ex: image/Form.tsx,
 * via ImagePickerModal) puxam react-image-crop, cuja importação de CSS
 * direto de node_modules quebra o carregamento em SSR (Node não sabe
 * resolver ".css"). Como PageRenderer é a única peça deste registry que o
 * SSR realmente toca, isolar os renderers evita carregar código de edição
 * (e suas dependências só-de-browser) numa árvore que só renderiza
 * conteúdo já salvo.
 *
 * Ao adicionar um bloco novo, registre o renderer aqui também (além de
 * blocks/registry.ts) — os dois precisam ficar em sincronia.
 */
export const rendererRegistry: Record<BlockType, RendererConfig> = {
  text: { renderer: TextRenderer as RendererConfig['renderer'] },
  image: { renderer: ImageRenderer as RendererConfig['renderer'] },
  button: { renderer: ButtonRenderer as RendererConfig['renderer'] },
  span: { renderer: SpanRenderer as RendererConfig['renderer'] },
  pills: { renderer: PillsRenderer as RendererConfig['renderer'] },
  buttonGroup: { renderer: ButtonGroupRenderer as RendererConfig['renderer'] },
  cta: { renderer: CtaRenderer as RendererConfig['renderer'] },
  'media-text': { renderer: MediaTextRenderer as RendererConfig['renderer'] },
  cards: { renderer: CardsRenderer as RendererConfig['renderer'] },
  form: { renderer: FormRenderer as RendererConfig['renderer'] },
  hero: { renderer: HeroRenderer as RendererConfig['renderer'] },
  'recent-posts': { renderer: RecentPostsRenderer as RendererConfig['renderer'] },
  'social-links': { renderer: SocialLinksRenderer as RendererConfig['renderer'] },
  'whatsapp-cta': { renderer: WhatsAppCtaRenderer as RendererConfig['renderer'] },
  'contact-info': { renderer: ContactInfoRenderer as RendererConfig['renderer'] },
  services: { renderer: ServicesRenderer as RendererConfig['renderer'] }
};
