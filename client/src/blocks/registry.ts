import type { BlockType } from '@/types';
import type { BlockConfig } from './_shared/types';

import { TextRenderer } from './text/renderer';
import { TextBlockForm } from './text/Form';
import { textDefault } from './text/schema';

import { ImageRenderer } from './image/renderer';
import { ImageBlockForm } from './image/Form';
import { imageDefault } from './image/schema';

import { ButtonRenderer } from './button/renderer';
import { ButtonBlockForm } from './button/Form';
import { buttonDefault } from './button/schema';

import { SpanRenderer } from './span/renderer';
import { SpanBlockForm } from './span/Form';
import { spanDefault } from './span/schema';

import { PillsRenderer } from './pills/renderer';
import { PillsBlockForm } from './pills/Form';
import { pillsDefault } from './pills/schema';

import { ButtonGroupRenderer } from './button-group/renderer';
import { ButtonGroupBlockForm } from './button-group/Form';
import { buttonGroupDefault } from './button-group/schema';

import { CtaRenderer } from './cta/renderer';
import { CtaBlockForm } from './cta/Form';
import { ctaDefault } from './cta/schema';

import { MediaTextRenderer } from './media-text/renderer';
import { MediaTextBlockForm } from './media-text/Form';
import { mediaTextDefault } from './media-text/schema';

import { CardsRenderer } from './cards/renderer';
import { CardsBlockForm } from './cards/Form';
import { cardsDefault } from './cards/schema';

import { FormRenderer } from './form/renderer';
import { FormBlockForm } from './form/Form';
import { formDefault } from './form/schema';

import { HeroRenderer } from './hero/renderer';
import { HeroBlockForm } from './hero/Form';
import { heroDefault } from './hero/schema';

import { RecentPostsRenderer } from './recent-posts/renderer';
import { RecentPostsForm } from './recent-posts/Form';
import { recentPostsDefault } from './recent-posts/schema';

import { SocialLinksRenderer } from './social-links/renderer';
import { SocialLinksBlockForm } from './social-links/Form';
import { socialLinksDefault } from './social-links/schema';

import { WhatsAppCtaRenderer } from './whatsapp-cta/renderer';
import { WhatsAppCtaBlockForm } from './whatsapp-cta/Form';
import { whatsAppCtaDefault } from './whatsapp-cta/schema';

import { ContactInfoRenderer } from './contact-info/renderer';
import { ContactInfoForm } from './contact-info/Form';
import { contactInfoDefault } from './contact-info/schema';

import { ServicesRenderer } from './services/renderer';
import { ServicesForm } from './services/Form';
import { servicesDefault } from './services/schema';

export const blockRegistry: Record<BlockType, BlockConfig> = {
  text:           { label: 'Texto',           defaultData: textDefault,        renderer: TextRenderer as BlockConfig['renderer'],           form: TextBlockForm as BlockConfig['form'] },
  image:          { label: 'Imagem',          defaultData: imageDefault,       renderer: ImageRenderer as BlockConfig['renderer'],          form: ImageBlockForm as BlockConfig['form'] },
  button:         { label: 'Botao',           defaultData: buttonDefault,      renderer: ButtonRenderer as BlockConfig['renderer'],         form: ButtonBlockForm as BlockConfig['form'] },
  span:           { label: 'Elemento',        defaultData: spanDefault,        renderer: SpanRenderer as BlockConfig['renderer'],           form: SpanBlockForm as BlockConfig['form'] },
  pills:          { label: 'Pills',           defaultData: pillsDefault,       renderer: PillsRenderer as BlockConfig['renderer'],          form: PillsBlockForm as BlockConfig['form'] },
  buttonGroup:    { label: 'Grupo de Botoes', defaultData: buttonGroupDefault, renderer: ButtonGroupRenderer as BlockConfig['renderer'],    form: ButtonGroupBlockForm as BlockConfig['form'] },
  cta:            { label: 'CTA',             defaultData: ctaDefault,         renderer: CtaRenderer as BlockConfig['renderer'],            form: CtaBlockForm as BlockConfig['form'] },
  'media-text':   { label: 'Imagem + Texto',  defaultData: mediaTextDefault,   renderer: MediaTextRenderer as BlockConfig['renderer'],      form: MediaTextBlockForm as BlockConfig['form'] },
  cards:          { label: 'Cards',           defaultData: cardsDefault,       renderer: CardsRenderer as BlockConfig['renderer'],          form: CardsBlockForm as BlockConfig['form'] },
  form:           { label: 'Formulario',      defaultData: formDefault,        renderer: FormRenderer as BlockConfig['renderer'],           form: FormBlockForm as BlockConfig['form'] },
  hero:           { label: 'Hero',            defaultData: heroDefault,        renderer: HeroRenderer as BlockConfig['renderer'],           form: HeroBlockForm as BlockConfig['form'] },
  'recent-posts': { label: 'Posts Recentes',  defaultData: recentPostsDefault, renderer: RecentPostsRenderer as BlockConfig['renderer'],   form: RecentPostsForm as BlockConfig['form'] },
  'social-links': { label: 'Redes Sociais',   defaultData: socialLinksDefault, renderer: SocialLinksRenderer as BlockConfig['renderer'],   form: SocialLinksBlockForm as BlockConfig['form'] },
  'whatsapp-cta': { label: 'WhatsApp CTA',    defaultData: whatsAppCtaDefault, renderer: WhatsAppCtaRenderer as BlockConfig['renderer'],   form: WhatsAppCtaBlockForm as BlockConfig['form'] },
  'contact-info': { label: 'Info de Contato', defaultData: contactInfoDefault, renderer: ContactInfoRenderer as BlockConfig['renderer'],   form: ContactInfoForm as BlockConfig['form'] },
  services:       { label: 'Servicos',        defaultData: servicesDefault,    renderer: ServicesRenderer as BlockConfig['renderer'],       form: ServicesForm as BlockConfig['form'] },
};
