import type { PageLayoutV2, PageSection, PageBlock } from '../types';
import { sanitizePageLayout } from './layoutSanitizer';
import { v4 as uuidv4 } from 'uuid';

export type PageTemplate = {
  id: string;
  name: string;
  description: string;
  thumbnailKey?: string;
};

// Generate unique IDs for sections, columns, and blocks
const generateId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${timestamp}_${random}`; // Garantir pelo menos 6 caracteres
};

// Helper function to create text block
const createTextBlock = (contentHtml: string): PageBlock => ({
  id: generateId(),
  type: 'text',
  data: { contentHtml }
});

// Helper function to create placeholder text (instead of invalid image blocks)
const createPlaceholderText = (message: string): PageBlock => ({
  id: generateId(),
  type: 'text',
  data: {
    contentHtml: `<div style="background: #f3f4f6; padding: 2rem; border-radius: 8px; text-align: center; color: #6b7280;">
      <p><strong><i class="fas fa-camera"></i> ${message}</strong></p>
      <p style="font-size: 0.9em; margin-top: 0.5rem;">Use o editor para adicionar uma imagem aqui.</p>
    </div>`
  }
});

// Helper function to create button block
const createButtonBlock = (label: string, href = 'https://example.com', variant: 'primary' | 'secondary' = 'primary'): PageBlock => ({
  id: generateId(),
  type: 'button',
  data: {
    label,
    href,
    variant,
    newTab: false
  }
});

// Helper function to create cards block (for features/benefits)
const createCardsBlock = (title: string, items: Array<{ title: string; text: string }>): PageBlock => ({
  id: generateId(),
  type: 'cards',
  data: {
    title,
    layout: 'auto' as const,
    variant: 'feature' as const,
    items: items.map(item => ({
      id: generateId(),
      title: item.title,
      text: item.text
    }))
  }
});

// Helper function to create contact info block (combines text + whatsapp + social)
const createContactInfoBlock = (
  titleHtml: string = '<h2>Preferiu falar direto?</h2><p>Escolha a forma de contato que preferir:</p>',
  whatsappLabel: string = 'Enviar mensagem',
  socialLinksTitle: string = 'Redes Sociais'
): PageBlock => ({
  id: generateId(),
  type: 'contact-info',
  data: {
    titleHtml,
    whatsappLabel,
    whatsappVariant: 'primary' as const,
    socialLinksTitle,
    socialLinksVariant: 'list' as const
  }
});

// Helper function to create form block (contact form)
const createFormBlock = (
  title: string = 'Fale comigo',
  description?: string | null
): PageBlock => ({
  id: generateId(),
  type: 'form',
  data: {
    title,
    description: description || null,
    fields: [
      { id: uuidv4(), type: 'text', label: 'Nome', placeholder: null, required: true, options: null },
      { id: uuidv4(), type: 'email', label: 'Email', placeholder: null, required: true, options: null },
      { id: uuidv4(), type: 'tel', label: 'WhatsApp', placeholder: null, required: false, options: null },
      { id: uuidv4(), type: 'textarea', label: 'Mensagem', placeholder: null, required: true, options: null }
    ],
    submitLabel: 'Enviar mensagem',
    successMessage: 'Mensagem enviada! Entraremos em contato em breve.',
    storeSummaryKeys: ['name', 'email', 'phone']
  }
});

// Create a section with specified columns and blocks
const createSection = (
  columns: 1 | 2 | 3, 
  colsBlocks: PageBlock[][], 
  settings?: PageSection['settings']
): PageSection => ({
  id: generateId(),
  columns,
  cols: colsBlocks.map(blocks => ({
    id: generateId(),
    blocks
  })),
  settings: {
    background: 'none',
    padding: 'normal',
    maxWidth: 'normal',
    ...settings
  }
});

// Template: Página de Serviço
const buildServicePageLayout = (): PageLayoutV2 => ({
  version: 2,
  sections: [
    // Section 1: Hero (2 colunas)
    createSection(2, [
      // Col 1: Text + Button
      [
        createTextBlock(`
          <h1>Seu Serviço Profissional</h1>
          <p>Transforme seu negócio com nossas soluções especializadas. Oferecemos:</p>
          <ul>
            <li><i class="fas fa-check"></i> Atendimento personalizado</li>
            <li><i class="fas fa-check"></i> Resultados comprovados</li>
            <li><i class="fas fa-check"></i> Suporte completo</li>
          </ul>
        `),
        createButtonBlock('Agendar Consulta', 'https://example.com/contato')
      ],
      // Col 2: Placeholder
      [createPlaceholderText('Adicione uma imagem representativa do serviço')]
    ]),

    // Section 2: Features (3 colunas)
    createSection(1, [
      [createCardsBlock('Nossos Diferenciais', [
        {
          title: 'Experiência',
          text: 'Anos de mercado oferecendo soluções de qualidade para nossos clientes.'
        },
        {
          title: 'Qualidade',
          text: 'Padrões elevados em todos os processos e entregas realizadas.'
        },
        {
          title: 'Suporte',
          text: 'Acompanhamento completo antes, durante e após a prestação do serviço.'
        }
      ])]
    ]),

    // Section 3: Form (2 colunas)
    createSection(2, [
      // Col 1: Text
      [createTextBlock(`
        <h2>Vamos conversar?</h2>
        <p>Preencha o formulário ao lado e entraremos em contato para discutir como podemos ajudar seu negócio a crescer.</p>
      `)],
      // Col 2: Form
      [createTextBlock(`
        <h3>Em breve: formulário de contato</h3>
        <p>Formulário será adicionado em breve.</p>
      `)]
    ])
  ]
});

// Template: Sobre Mim
const buildAboutPageLayout = (): PageLayoutV2 => ({
  version: 2,
  sections: [
    // Section 1: Intro (2 colunas)
    createSection(2, [
      // Col 1: Text
      [createTextBlock(`
        <h1>Sobre Mim</h1>
        <p>Olá! Sou [Seu Nome], e trabalho há X anos na área de [Sua Área]. Minha missão é [Sua Missão].</p>
        <p>Ao longo da minha jornada, desenvolvi experiência em:</p>
        <ul>
          <li>Área de especialidade 1</li>
          <li>Área de especialidade 2</li>
          <li>Área de especialidade 3</li>
        </ul>
        <p>Acredito que [Seus valores e filosofia de trabalho].</p>
      `)],
      // Col 2: Placeholder
      [createPlaceholderText('Adicione sua foto profissional')]
    ]),

    // Section 2: CTA (1 coluna)
    createSection(1, [
      [
        createTextBlock(`
          <h2 style="text-align: center;">Pronto para trabalharmos juntos?</h2>
          <p style="text-align: center;">Entre em contato e vamos conversar sobre como posso ajudar você a alcançar seus objetivos.</p>
        `),
        createButtonBlock('Entre em Contato', 'https://example.com/contato')
      ]
    ])
  ]
});

// Template: Landing Page
const buildLandingPageLayout = (): PageLayoutV2 => ({
  version: 2,
  sections: [
    // Section 1: Hero (2 colunas)
    createSection(2, [
      // Col 1: Text + CTA
      [
        createTextBlock(`
          <h1>Transforme Seu Negócio Hoje</h1>
          <p class="lead">A solução que você precisa para levar sua empresa ao próximo nível. Resultados garantidos em 30 dias ou seu dinheiro de volta.</p>
        `),
        createButtonBlock('Começar Agora', 'https://example.com/contato')
      ],
      // Col 2: Placeholder
      [createPlaceholderText('Adicione uma imagem hero impactante')]
    ]),

    // Section 2: Benefits (3 colunas como cards)
    createSection(1, [
      [createCardsBlock('Por Que Escolher Nossa Solução', [
        {
          title: '<i class="fas fa-rocket"></i> Resultado Rápido',
          text: 'Veja os primeiros resultados em apenas 7 dias de implementação.'
        },
        {
          title: '<i class="fas fa-gem"></i> Qualidade Premium',
          text: 'Tecnologia de ponta e metodologia comprovada no mercado.'
        },
        {
          title: '<i class="fas fa-chart-line"></i> ROI Garantido',
          text: 'Retorno sobre investimento comprovado ou devolvemos seu dinheiro.'
        }
      ])]
    ]),

    // Section 3: Depoimentos (1 coluna)
    createSection(1, [
      [createTextBlock(`
        <h2 style="text-align: center;">O Que Nossos Clientes Dizem</h2>
        <p style="text-align: center;">"Resultado incrível! Em 15 dias já estava vendo os primeiros frutos. Recomendo muito!" - João Silva</p>
        <p style="text-align: center;">"O melhor investimento que fiz para meu negócio. O suporte é excepcional!" - Maria Santos</p>
      `)]
    ]),

    // Section 4: CTA (2 colunas)
    createSection(2, [
      // Col 1: Text
      [createTextBlock(`
        <h2>Comece Sua Transformação Hoje</h2>
        <p>Entre em contato conosco e receba uma análise gratuita personalizada para seu negócio.</p>
        <p><strong><i class="fas fa-check"></i> Sem compromisso<br><i class="fas fa-check"></i> Resposta em até 24h<br><i class="fas fa-check"></i> Consultoria gratuita</strong></p>
      `)],
      // Col 2: CTA
      [createTextBlock(`
        <h3>Em breve: formulário de contato</h3>
        <p>Formulário será adicionado em breve.</p>
      `)]
    ])
  ]
});

// Template: Contato
const buildContactPageLayout = (): PageLayoutV2 => ({
  version: 2,
  sections: [
    // Section 1: Contact Info + Form (2 colunas com fundo suave)
    createSection(2, [
      // Col 1: Bloco único de informações de contato
      [
        {
          ...createContactInfoBlock(
            '<h2>Preferiu falar direto?</h2><p>Escolha a forma de contato que preferir:</p>',
            'Enviar mensagem',
            'Redes Sociais'
          ),
          rowIndex: 0
        }
      ],
      // Col 2: Formulário de contato
      [
        {
          ...createFormBlock(
            'Envie sua mensagem',
            'Preencha o formulário abaixo e entraremos em contato o mais breve possível.'
          ),
          rowIndex: 0
        }
      ]
    ], { background: 'soft', padding: 'normal', maxWidth: 'normal' })
  ]
});

// Create blank page layout
const buildBlankPageLayout = (): PageLayoutV2 => ({
  version: 2,
  sections: [
    createSection(1, [
      [createTextBlock(`
        <h1>Título da Página</h1>
        <p>Clique para editar este conteúdo e começar a criar sua página.</p>
      `)]
    ])
  ]
});

// Template list
export const getTemplateList = (): PageTemplate[] => [
  {
    id: 'service',
    name: 'Página de Serviço',
    description: 'Hero + recursos + formulário de contato'
  },
  {
    id: 'about',
    name: 'Sobre Mim',
    description: 'Apresentação pessoal + call-to-action'
  },
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Hero + benefícios + depoimentos + formulário'
  },
  {
    id: 'contact',
    name: 'Contato',
    description: 'WhatsApp + redes sociais + formulário de contato'
  },
  {
    id: 'blank',
    name: 'Página em Branco',
    description: 'Comece do zero com uma página vazia'
  }
];

// Build page layout from template
export const buildPageLayoutFromTemplate = (templateId: string): PageLayoutV2 => {
  switch (templateId) {
    case 'service':
      return buildServicePageLayout();
    case 'about':
      return buildAboutPageLayout();
    case 'landing':
      return buildLandingPageLayout();
    case 'contact':
      return buildContactPageLayout();
    case 'blank':
      return buildBlankPageLayout();
    default:
      return buildBlankPageLayout();
  }
};

// Generate default page data for template
export const generatePageDataFromTemplate = (templateId: string) => {
  const templates = getTemplateList();
  const template = templates.find(t => t.id === templateId);
  
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  const rawLayout = buildPageLayoutFromTemplate(templateId);
  
  // Sanitize layout to ensure it's valid (removes invalid blocks)
  const layout = sanitizePageLayout(rawLayout);
  
  return {
    title: template ? `Nova ${template.name}` : 'Nova Página',
    slug: `nova-pagina-${timestamp}-${random}`, // Incluir random para garantir unicidade
    description: template?.description || '',
    layout,
    status: 'draft' as const
  };
};
