import { v4 as uuidv4 } from 'uuid';
import type { PageBlock, PageSection } from '../types';
import imagePlaceholder from '../assets/image-placeholder.svg';

export type SectionPreset = {
  id: string;
  name: string;
  description: string;
  icon: string;
  section: Omit<PageSection, 'id'>;
};

export const sectionPresets: SectionPreset[] = [
  {
    id: 'hero-2col',
    name: 'Hero 2 Colunas',
    description: 'Seção Hero completa (única por página)',
    icon: '🎯',
    section: {
      kind: 'hero',
      columns: 1,
      cols: [
        {
          id: uuidv4(),
          blocks: [
            {
              id: uuidv4(),
              type: 'hero',
              data: {
                version: 2,
                layout: 'two-col',
                layoutVariant: 'split',
                imageHeight: 'lg',
                rightVariant: 'image-only',
                left: [
                  {
                    id: uuidv4(),
                    type: 'text',
                    data: {
                      contentHtml: '<h1>[Título de impacto sobre o seu negócio]</h1>',
                      width: 'normal',
                      background: 'none'
                    }
                  },
                  {
                    id: uuidv4(),
                    type: 'span',
                    data: {
                      kind: 'accent-bar'
                    }
                  },
                  {
                    id: uuidv4(),
                    type: 'text',
                    data: {
                      contentHtml: '<p>[Descreva em 1-2 frases o que você oferece e para quem]</p>',
                      width: 'normal',
                      background: 'none'
                    }
                  },
                  {
                    id: uuidv4(),
                    type: 'pills',
                    data: {
                      items: ['Diferencial 1', 'Diferencial 2', 'Diferencial 3'],
                      size: 'sm',
                      variant: 'neutral'
                    }
                  },
                  {
                    id: uuidv4(),
                    type: 'buttonGroup',
                    data: {
                      buttons: [
                        {
                          label: 'Agendar sessão',
                          href: '/contato',
                          variant: 'primary',
                          linkMode: 'page',
                          pageKey: 'contato'
                        },
                        {
                          label: 'Conhecer a abordagem',
                          href: '/sobre',
                          variant: 'secondary',
                          linkMode: 'page',
                          pageKey: 'sobre'
                        }
                      ],
                      align: 'start',
                      stackOnMobile: true
                    }
                  },
                  {
                    id: uuidv4(),
                    type: 'text',
                    data: {
                      contentHtml: '<p class="muted"><small>Atendimento online e presencial • Sigilo e confidencialidade garantidos</small></p>',
                      width: 'normal',
                      background: 'none'
                    }
                  }
                ],
                right: [
                  {
                    id: uuidv4(),
                    type: 'image',
                    data: {
                      mediaId: null,
                      src: '',
                      alt: 'Imagem Hero',
                      caption: null,
                      size: 100,
                      align: 'center',
                      naturalWidth: null,
                      naturalHeight: null
                    }
                  }
                ]
              }
            }
          ]
        }
      ],
      settings: {
        background: 'none',
        padding: 'normal',
        maxWidth: 'normal'
      }
    }
  },
  {
    id: 'features-3col',
    name: 'Features 3 Colunas',
    description: 'Grade de recursos com cards',
    icon: '⚡',
    section: {
      columns: 1,
      cols: [
        {
          id: uuidv4(),
          blocks: [
            {
              id: uuidv4(),
              type: 'cards',
              data: {
                title: 'Por Que Nos Escolher',
                subtitle: 'Oferecemos as melhores soluções para o seu negócio',
                items: [
                  {
                    id: uuidv4(),
                    icon: '⚡',
                    title: 'Rápido',
                    text: 'Resultados em tempo recorde com nossa metodologia comprovada',
                    ctaLabel: null,
                    ctaHref: null
                  },
                  {
                    id: uuidv4(),
                    icon: '🎯',
                    title: 'Preciso',
                    text: 'Qualidade garantida em cada detalhe do trabalho',
                    ctaLabel: null,
                    ctaHref: null
                  },
                  {
                    id: uuidv4(),
                    icon: '✨',
                    title: 'Profissional',
                    text: 'Atendimento especializado com foco em resultados',
                    ctaLabel: null,
                    ctaHref: null
                  }
                ],
                layout: '3',
                variant: 'feature'
              }
            }
          ]
        }
      ],
      settings: {
        background: 'soft',
        padding: 'normal',
        maxWidth: 'normal'
      }
    }
  },
  {
    id: 'cta-1col',
    name: 'CTA Box',
    description: 'Chamada para ação com imagem lateral opcional',
    icon: '📣',
    section: {
      columns: 1,
      cols: [
        {
          id: uuidv4(),
          blocks: [
            {
              id: uuidv4(),
              type: 'cta',
              data: {
                title: 'Pronto para Começar?',
                text: 'Entre em contato agora e descubra como podemos ajudar você a alcançar seus objetivos.',
                ctaLabel: 'Falar com Especialista',
                ctaHref: '/contato',
                ctaLinkMode: 'page',
                ctaPageKey: 'contato',
                ctaPageId: null,
                ctaSlug: null,
                imageId: null,
                imageUrl: imagePlaceholder,
                imageAlt: 'Imagem do CTA',
                imageSide: 'right',
                imageDissolve: true,
                imageDissolveStrength: 'medium'
              }
            }
          ]
        }
      ],
      settings: {
        background: 'none',
        padding: 'normal',
        maxWidth: 'normal'
      }
    }
  },
  {
    id: 'faq-1col',
    name: 'Perguntas Frequentes',
    description: 'Acordeon de perguntas e respostas',
    icon: '❓',
    section: {
      columns: 1,
      cols: [
        {
          id: uuidv4(),
          blocks: [
            {
              id: uuidv4(),
              type: 'faq',
              data: {
                title: 'Dúvidas frequentes',
                subtitle: 'Se a sua dúvida não estiver aqui, entre em contato.',
                items: [
                  { id: uuidv4(), question: 'Pergunta 1?', answer: 'Resposta da pergunta 1.' },
                  { id: uuidv4(), question: 'Pergunta 2?', answer: 'Resposta da pergunta 2.' },
                  { id: uuidv4(), question: 'Pergunta 3?', answer: 'Resposta da pergunta 3.' }
                ],
                defaultOpenIndex: 0
              }
            }
          ]
        }
      ],
      settings: {
        background: 'none',
        padding: 'normal',
        maxWidth: 'normal'
      }
    }
  },
  {
    id: 'content-1col',
    name: 'Conteúdo Longo',
    description: 'Texto corrido para artigos',
    icon: '📝',
    section: {
      columns: 1,
      cols: [
        {
          id: uuidv4(),
          blocks: [
            {
              id: uuidv4(),
              type: 'text',
              data: {
                contentHtml: '<h2>Título da Seção</h2><p>Inicie seu conteúdo aqui. Use este espaço para textos longos, artigos, descrições detalhadas ou qualquer tipo de conteúdo editorial.</p><p>Você pode adicionar múltiplos parágrafos, listas, citações e outros elementos de formatação conforme necessário.</p>',
                width: 'wide',
                background: 'soft'
              }
            }
          ]
        }
      ],
      settings: {
        background: 'soft',
        padding: 'normal',
        maxWidth: 'normal'
      }
    }
  },
  {
    id: 'form-2col',
    name: 'Formulário 2 Colunas',
    description: 'Texto + Formulário de contato',
    icon: '📬',
    section: {
      columns: 2,
      cols: [
        {
          id: uuidv4(),
          blocks: [
            {
              id: uuidv4(),
              type: 'text',
              data: {
                contentHtml: '<h2>Entre em Contato</h2><p>Estamos aqui para ajudar. Preencha o formulário e entraremos em contato o mais breve possível.</p><ul><li>Resposta em até 24 horas</li><li>Atendimento personalizado</li><li>Sem compromisso</li></ul>',
                width: 'normal',
                background: 'none'
              }
            }
          ]
        },
        {
          id: uuidv4(),
          blocks: [
            {
              id: uuidv4(),
              type: 'form',
              data: {
                title: 'Fale Comigo',
                description: null,
                fields: [
                  {
                    id: uuidv4(),
                    type: 'text',
                    label: 'Nome',
                    placeholder: 'Seu nome completo',
                    required: true,
                    options: null
                  },
                  {
                    id: uuidv4(),
                    type: 'email',
                    label: 'Email',
                    placeholder: 'seu@email.com',
                    required: true,
                    options: null
                  },
                  {
                    id: uuidv4(),
                    type: 'tel',
                    label: 'WhatsApp',
                    placeholder: '(00) 00000-0000',
                    required: false,
                    options: null
                  },
                  {
                    id: uuidv4(),
                    type: 'textarea',
                    label: 'Mensagem',
                    placeholder: 'Como podemos ajudar?',
                    required: true,
                    options: null
                  }
                ],
                submitLabel: 'Enviar Mensagem',
                successMessage: 'Mensagem enviada com sucesso! Entraremos em contato em breve.',
                storeSummaryKeys: ['nome', 'email', 'whatsapp']
              }
            }
          ]
        }
      ],
      settings: {
        background: 'soft',
        padding: 'normal',
        maxWidth: 'normal'
      }
    }
  },
  {
    id: 'recent-posts',
    name: 'Conteúdos recentes',
    description: 'Lista automática de artigos recentes',
    icon: '📰',
    section: {
      kind: 'normal',
      columns: 1,
      cols: [
        {
          id: uuidv4(),
          blocks: [
            {
              id: uuidv4(),
              type: 'recent-posts',
              data: {
                title: 'Conteúdos recentes',
                subtitle: 'Leituras curtas para acompanhar você entre as sessões.',
                ctaLabel: 'Ver todos os artigos',
                ctaHref: '/blog',
                ctaLinkMode: 'page',
                ctaPageKey: 'blog',
                ctaPageId: null,
                ctaSlug: '/blog',
                postsLimit: 3
              }
            }
          ]
        }
      ],
      settings: {
        background: 'soft',
        padding: 'normal',
        maxWidth: 'normal'
      }
    }
  },
  {
    id: 'services-4',
    name: 'Serviços (4 itens)',
    description: 'Título + 4 serviços com ícone fixo',
    icon: '🌀',
    section: {
      columns: 1,
      cols: [
        {
          id: uuidv4(),
          blocks: [
            {
              id: uuidv4(),
              type: 'services',
              data: {
                sectionTitle: 'Serviços',
                buttonLabel: 'Saiba mais',
                items: [
                  {
                    id: uuidv4(),
                    title: '[Nome do Serviço]',
                    description: '[Breve descrição do serviço oferecido]',
                    href: '/servicos/nome-do-servico'
                  },
                  {
                    id: uuidv4(),
                    title: 'Arteterapia',
                    description: 'Expressão criativa para dar forma ao que você sente.',
                    href: '/servicos/arteterapia'
                  },
                  {
                    id: uuidv4(),
                    title: 'Orientação vocacional',
                    description: 'Clareza de caminhos e escolhas com significado.',
                    href: '/servicos/orientacao-vocacional'
                  },
                  {
                    id: uuidv4(),
                    title: 'Cerâmica',
                    description: 'Processo terapêutico através do gesto e da matéria.',
                    href: '/servicos/ceramica'
                  }
                ]
              }
            }
          ]
        }
      ],
      settings: {
        background: 'soft',
        padding: 'normal',
        maxWidth: 'normal'
      }
    }
  }
];

export const getPresetById = (id: string): SectionPreset | undefined => {
  return sectionPresets.find((preset) => preset.id === id);
};

// Helper para regenerar IDs recursivamente em blocos (incluindo blocos nested)
const regenerateBlockIds = (block: PageBlock): PageBlock => {
  const newBlock = { ...block, id: uuidv4() };

  // Se for Hero V2, regenerar IDs dos blocos filhos
  if (block.type === 'hero' && 'version' in block.data && block.data.version === 2) {
    return {
      ...newBlock,
      data: {
        ...block.data,
        left: (block.data.left || []).map(regenerateBlockIds),
        right: (block.data.right || []).map(regenerateBlockIds)
      }
    } as PageBlock;
  }

  if (block.type === 'services' && Array.isArray(block.data.items)) {
    return {
      ...newBlock,
      data: {
        ...block.data,
        items: block.data.items.map((item) => ({ ...item, id: uuidv4() }))
      }
    } as PageBlock;
  }

  return newBlock;
};

export const createSectionFromPreset = (presetId: string): PageSection | null => {
  const preset = getPresetById(presetId);
  if (!preset) return null;

  return {
    id: uuidv4(),
    ...preset.section,
    // Regenerate IDs for all blocks to ensure uniqueness (including nested blocks)
    cols: preset.section.cols.map((col) => ({
      ...col,
      id: uuidv4(),
      blocks: col.blocks.map(regenerateBlockIds)
    }))
  };
};
