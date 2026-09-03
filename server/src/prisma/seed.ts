import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { normalizePageLayout } from '../utils/pageLayout';
import { logger } from '../config/logger';

const WHATSAPP_NUMBER = '5511912508315';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
// URL absoluta exigida pela validação do bloco `image` (normalizePageLayout
// só aceita http(s)). O arquivo é servido como asset estático do client
// (client/public/images/alessandra-profissional.png).
const PROFESSIONAL_PHOTO = `${env.CLIENT_URL}/images/alessandra-profissional.png`;

// Onda decorativa entre seções (client/public/decor/wave.svg via CSS mask,
// ver .section-wave em public.css) — bloco "pills" vazio só para a seção
// não ficar sem conteúdo (schema exige ao menos 1 bloco por coluna).
function waveDivider(modifierClass: string) {
  return {
    id: randomUUID(),
    columns: 1,
    cols: [{ id: randomUUID(), blocks: [{ type: 'pills', data: { pills: [] } }] }],
    settings: { customClass: `section-wave ${modifierClass}`, padding: 'compact' }
  };
}

async function main() {
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: env.ADMIN_EMAIL },
    update: { password: passwordHash, role: 'admin' },
    create: { email: env.ADMIN_EMAIL, password: passwordHash, name: env.ADMIN_EMAIL.split('@')[0], role: 'admin' }
  });

  // --- Site settings (identidade, tema, contato) ---
  const siteSettingsData = {
    siteName: 'Alessandra Mazzieri',
    contactEmail: 'ale.psijung@gmail.com',
    phone: '(11) 91250-8315',
    // A referência não exibe subtítulo abaixo do logo na navbar — mantido null
    // para não ativar o `nav-brand-tagline` genérico do Navbar.
    brandTagline: null,
    hideScheduleCta: false,
    address: {
      neighborhood: 'Vila Mariana',
      city: 'São Paulo',
      state: 'SP'
    } as Prisma.InputJsonValue,
    socials: [
      {
        id: randomUUID(),
        platform: 'instagram',
        // `label` é o valor identificador usado no rodapé (convenção: mostra o dado real, não
        // o nome da plataforma); o card de contato ignora `label` e sempre usa "Instagram" como
        // título, com `description` como subtexto — ver ContactInfoRenderer.getLabelForSocial.
        label: '@ale.psijung',
        description: '@ale.psijung',
        url: 'https://instagram.com/ale.psijung',
        order: 0,
        isVisible: true
      },
      {
        id: randomUUID(),
        platform: 'email',
        label: null,
        description: 'Envie sua mensagem',
        url: 'mailto:ale.psijung@gmail.com',
        order: 1,
        isVisible: true
      }
    ] as Prisma.InputJsonValue,
    whatsappEnabled: true,
    whatsappLink: WHATSAPP_NUMBER,
    whatsappMessage: null,
    whatsappPosition: 'right',
    metaDescription:
      'Terapia junguiana online para mulheres 40+ com Alessandra Mazzieri, psicoterapeuta junguiana. Atendimento discreto e profissional, em português.',
    // As cores exatas da referência (creme/blush/oliva/marrom/ocre/bordô) vão
    // muito além dos 4 slots deste tema (background/text/primary/accent) —
    // o restante da paleta e as decorações (flores, ondas, marquee, fonte
    // script) são aplicadas via CSS específico deste site em public.css,
    // escopado pelas classes `section-*`/`customClass` das seções da Home.
    theme: {
      preset: 'terra-oliva',
      colors: {
        background: '#FCF3E7',
        text: '#704512',
        primary: '#7F2A4D',
        accent: '#B96F28'
      },
      typography: {
        headingFont: 'Fraunces',
        bodyFont: 'Montserrat'
      }
    } as Prisma.InputJsonValue
  };

  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: siteSettingsData,
    create: { id: 'default', ...siteSettingsData }
  });

  // --- Navegação (site de página única — todos os itens, exceto Início,
  // são âncoras dentro da própria Home) ---
  await prisma.navItem.deleteMany();
  await prisma.navItem.createMany({
    data: [
      { label: 'Início', type: 'INTERNAL_PAGE', pageKey: 'home', isParent: true, showInNavbar: true, showInFooter: true, orderNavbar: 0, orderFooter: 0, isVisible: true },
      { label: 'Sobre mim', type: 'EXTERNAL_URL', url: '/#sobre', isParent: true, showInNavbar: true, showInFooter: true, orderNavbar: 1, orderFooter: 1, isVisible: true },
      { label: 'Atendimento', type: 'EXTERNAL_URL', url: '/#atendimento', isParent: true, showInNavbar: true, showInFooter: true, orderNavbar: 2, orderFooter: 2, isVisible: true },
      { label: 'Processo', type: 'EXTERNAL_URL', url: '/#processo', isParent: true, showInNavbar: true, showInFooter: false, orderNavbar: 3, orderFooter: null, isVisible: true },
      { label: 'Dúvidas', type: 'EXTERNAL_URL', url: '/#duvidas', isParent: true, showInNavbar: true, showInFooter: true, orderNavbar: 4, orderFooter: 3, isVisible: true },
      { label: 'Contato', type: 'EXTERNAL_URL', url: '/#contato', isParent: true, showInNavbar: true, showInFooter: true, orderNavbar: 5, orderFooter: 4, isVisible: true }
    ]
  });

  await prisma.homeSection.deleteMany();

  // --- Home: site de página única, réplica de reference/index.html ---
  const homeLayout = normalizePageLayout({
    version: 2,
    sections: [
      {
        id: randomUUID(),
        kind: 'hero',
        columns: 1,
        cols: [
          {
            id: randomUUID(),
            blocks: [
              {
                type: 'hero',
                data: {
                  version: 2,
                  layout: 'two-col',
                  layoutVariant: 'split',
                  imageHeight: 'lg',
                  rightVariant: 'image-only',
                  left: [
                    { type: 'span', data: { kind: 'eyebrow', text: 'Terapeuta Junguiana' } },
                    {
                      type: 'text',
                      data: { contentHtml: '<h1>Você foi <em>forte demais</em> por tempo demais.</h1>', width: 'normal', background: 'none' }
                    },
                    {
                      type: 'text',
                      data: {
                        contentHtml:
                          '<p>Você sustenta carreira, família, relacionamentos — e ainda encontra tempo para todos, menos para si mesma. Isso não é fraqueza. É o sinal de que chegou a hora de se reencontrar.</p>',
                        width: 'normal',
                        background: 'none'
                      }
                    },
                    {
                      type: 'buttonGroup',
                      data: {
                        buttons: [{ label: 'Conversar pelo WhatsApp', href: WHATSAPP_URL, variant: 'primary', newTab: true, icon: 'whatsapp' }],
                        align: 'start',
                        stackOnMobile: true
                      }
                    }
                  ],
                  right: [
                    { type: 'image', data: { mediaId: null, src: PROFESSIONAL_PHOTO, alt: 'Alessandra Mazzieri', size: 100, align: 'center' } },
                    {
                      type: 'span',
                      data: { kind: 'floating-badge', icon: 'heart-outline', text: 'Você não precisa atravessar isso sozinha.' }
                    }
                  ]
                }
              }
            ]
          }
        ],
        settings: { background: 'none', padding: 'normal', maxWidth: 'normal', customClass: 'section-hero' }
      },
      {
        id: randomUUID(),
        columns: 2,
        cols: [
          {
            id: randomUUID(),
            blocks: [
              {
                type: 'image',
                data: {
                  mediaId: null,
                  src: PROFESSIONAL_PHOTO,
                  alt: 'Alessandra Mazzieri',
                  size: 100,
                  align: 'center',
                  caption: '"Compreender a própria história é o início do fortalecimento."'
                }
              }
            ]
          },
          {
            id: randomUUID(),
            blocks: [
              {
                type: 'text',
                data: {
                  contentHtml:
                    '<h2>Quem estará com você? <br/><em class="brand-script">Alessandra Mazzieri</em></h2>' +
                    '<ul>' +
                    '<li>Especialista em Psicologia Junguiana</li>' +
                    '<li>Especializando-se em Arteterapia</li>' +
                    '<li>Analista junguiana em formação pelo IJEP</li>' +
                    '<li>Terapia com base nos símbolos da alma</li>' +
                    '</ul>' +
                    '<p>Minha abordagem é fundamentada na Psicologia Analítica de Jung, com foco na integração da sombra, reconstrução da autonomia psíquica e fortalecimento do self.</p>' +
                    '<p>Você sempre foi competente, lúcida, responsável. Construiu carreira, sustentou decisões, segurou muitas pontas. Mas dentro do relacionamento algo mudou, e você começou a duvidar de si.</p>',
                  width: 'normal',
                  background: 'none'
                }
              },
              { type: 'button', data: { label: 'Falar com a terapeuta', href: WHATSAPP_URL, newTab: true, variant: 'primary' } }
            ]
          }
        ],
        settings: { background: 'none', padding: 'normal', maxWidth: 'normal', anchorId: 'sobre', customClass: 'section-sobre' }
      },
      waveDivider('wave-cream-burgundy'),
      {
        id: randomUUID(),
        columns: 1,
        cols: [
          {
            id: randomUUID(),
            blocks: [
              { type: 'span', data: { kind: 'eyebrow', text: 'Principais sinais de alerta' } },
              {
                type: 'cards',
                data: {
                  title: 'Você reconhece <em>alguma dessas sensações?</em>',
                  subtitle:
                    'A violência psicológica é silenciosa. Ela não deixa marcas visíveis, mas corrói a confiança aos poucos, e faz você acreditar que o problema é você.',
                  layout: '3',
                  variant: 'feature',
                  textColorMode: 'dark',
                  cardColorMode: 'custom',
                  cardColor: '#FCF3E7',
                  items: [
                    { id: randomUUID(), icon: 'cloud-moon', title: 'Exaustão sem explicação', text: 'Acordar cansada mesmo depois de dormir — como se carregar o mundo fosse a sua função.' },
                    { id: randomUUID(), icon: 'masks-theater', title: 'Perda da própria identidade', text: 'Sentir que perdeu o fio de quem você era antes de ser mãe, profissional, cônjuge, filha.' },
                    { id: randomUUID(), icon: 'circle-half-stroke', title: 'Vazio por dentro', text: 'Ter sucesso visível por fora e um vazio crescente por dentro.' },
                    { id: randomUUID(), icon: 'eye-slash', title: 'Duvidar de si mesma', text: 'Duvidar das suas próprias percepções — e se perguntar se está exagerando.' },
                    { id: randomUUID(), icon: 'compass', title: 'Falta de clareza no futuro', text: 'Sentir que o próximo passo da sua vida existe, mas não consegue enxergá-lo com clareza.' },
                    { id: randomUUID(), icon: 'hand-holding-heart', title: 'Cuida de todos, menos de si', text: 'Cuidar de todos — e se perguntar quando alguém vai cuidar de você.' }
                  ]
                }
              }
            ]
          }
        ],
        settings: {
          backgroundMode: 'color',
          backgroundColor: '#7F2A4D',
          padding: 'large',
          maxWidth: 'normal',
          anchorId: 'atendimento',
          customClass: 'section-signs'
        }
      },
      waveDivider('wave-burgundy-cream'),
      {
        id: randomUUID(),
        columns: 1,
        cols: [
          {
            id: randomUUID(),
            blocks: [
              { type: 'span', data: { kind: 'eyebrow', text: 'Para quem é o atendimento' } },
              {
                type: 'cards',
                data: {
                  title: 'Este espaço é para <em>você</em>, se reconhece algo disso',
                  subtitle: 'Formatos flexíveis para se adequar à sua necessidade, sempre com sigilo e respeito ao seu tempo.',
                  layout: '3',
                  variant: 'simple',
                  textColorMode: 'dark',
                  items: [
                    { id: randomUUID(), icon: 'user', title: 'Mulheres 40+', text: 'Que construíram carreira e relações, e hoje sentem a necessidade de olhar para si com mais cuidado.' },
                    { id: randomUUID(), icon: 'heart-crack', title: 'Relações com invalidação', text: 'Que vivem gaslighting, manipulação sutil, distorção dos fatos ou culpa invertida.' },
                    { id: randomUUID(), icon: 'spa', title: 'Momentos de retomada de si', text: 'Que buscam reconstruir a autonomia psíquica e retomar contato com a própria identidade.' }
                  ]
                }
              },
              {
                type: 'cta',
                data: {
                  title: 'Atendimento 100% Online',
                  text: 'Sessões por vídeo, no <em>conforto da sua casa</em>, com total sigilo e discrição.',
                  ctaLabel: ''
                }
              }
            ]
          }
        ],
        settings: { background: 'none', padding: 'normal', maxWidth: 'normal', customClass: 'section-personas' }
      },
      waveDivider('wave-cream-olive'),
      {
        id: randomUUID(),
        columns: 2,
        cols: [
          {
            id: randomUUID(),
            blocks: [
              { type: 'span', data: { kind: 'eyebrow', text: 'O caminho' } },
              {
                type: 'text',
                data: { contentHtml: '<h2>Como funciona o início da sua caminhada?</h2>', width: 'normal', background: 'none' }
              },
              {
                type: 'text',
                data: {
                  contentHtml:
                    '<p>Um caminho construído com respeito, escuta ativa e no seu tempo. Cada etapa é pensada para o seu acolhimento.</p>',
                  width: 'normal',
                  background: 'none'
                }
              },
              {
                type: 'buttonGroup',
                data: { buttons: [{ label: 'Conversar pelo WhatsApp', href: WHATSAPP_URL, variant: 'secondary', newTab: true }], align: 'start', stackOnMobile: true }
              }
            ]
          },
          {
            id: randomUUID(),
            blocks: [
              {
                type: 'cards',
                data: {
                  layout: 'auto',
                  variant: 'feature',
                  textColorMode: 'dark',
                  cardColorMode: 'custom',
                  cardColor: '#FCF3E7',
                  items: [
                    { id: randomUUID(), icon: '01', title: 'Primeiro contato', text: 'Envie uma mensagem pelo WhatsApp e conte, em poucas palavras, o motivo que te trouxe até aqui.' },
                    { id: randomUUID(), icon: '02', title: 'Sessão de acolhimento', text: 'Um encontro inicial para entender sua história, esclarecer dúvidas e alinhar como o processo pode te ajudar.' },
                    { id: randomUUID(), icon: '03', title: 'Encontros semanais', text: 'Sessões regulares, online, com continuidade para você seguir se compreendendo e se fortalecendo.' }
                  ]
                }
              }
            ]
          }
        ],
        settings: {
          backgroundMode: 'color',
          backgroundColor: '#647651',
          padding: 'large',
          maxWidth: 'normal',
          anchorId: 'processo',
          customClass: 'section-process'
        }
      },
      waveDivider('wave-olive-burgundy'),
      {
        id: randomUUID(),
        columns: 1,
        cols: [
          {
            id: randomUUID(),
            blocks: [
              { type: 'span', data: { kind: 'eyebrow', text: 'Dúvidas frequentes' } },
              {
                type: 'faq',
                data: {
                  title: 'Tudo o que você precisa saber antes de começar',
                  subtitle: 'Se a sua dúvida não estiver aqui, escreva pelo WhatsApp: será um prazer conversar.',
                  defaultOpenIndex: 0,
                  items: [
                    {
                      id: randomUUID(),
                      question: 'Como funciona a terapia online?',
                      answer: 'As sessões acontecem por videochamada, em horário combinado, com a mesma atenção e sigilo de um atendimento presencial. Você só precisa de um lugar tranquilo e conexão com a internet.'
                    },
                    {
                      id: randomUUID(),
                      question: 'Preciso já saber se estou vivendo gaslighting?',
                      answer: 'Não. Muitas mulheres chegam apenas sentindo que "algo não está bem" ou duvidando de si mesmas. Compreender o que está acontecendo faz parte do processo terapêutico.'
                    },
                    {
                      id: randomUUID(),
                      question: 'O atendimento é sigiloso?',
                      answer: 'Sim. Todo o conteúdo compartilhado nas sessões é protegido por sigilo profissional, conforme o código de ética da Psicologia.'
                    },
                    {
                      id: randomUUID(),
                      question: 'Como faço para agendar minha sessão?',
                      answer: 'É simples: clique em "Falar com a Terapeuta", envie uma mensagem pelo WhatsApp e combinaremos o melhor horário para o seu primeiro encontro.'
                    }
                  ]
                }
              }
            ]
          }
        ],
        settings: {
          backgroundMode: 'color',
          backgroundColor: '#7F2A4D',
          padding: 'normal',
          maxWidth: 'normal',
          anchorId: 'duvidas',
          customClass: 'section-faq'
        }
      },
      waveDivider('wave-burgundy-cream'),
      {
        id: randomUUID(),
        columns: 2,
        cols: [
          {
            id: randomUUID(),
            blocks: [{ type: 'image', data: { mediaId: null, src: PROFESSIONAL_PHOTO, alt: 'Alessandra Mazzieri', size: 100, align: 'center' } }]
          },
          {
            id: randomUUID(),
            blocks: [
              { type: 'span', data: { kind: 'eyebrow', text: 'Contato' } },
              {
                type: 'text',
                data: {
                  contentHtml:
                    '<h2>Entre em contato <em>comigo</em></h2><p>Se você sente que este pode ser o momento de iniciar sua terapia, escreva ou agende sua sessão.</p>',
                  width: 'normal',
                  background: 'none'
                }
              },
              {
                type: 'form',
                data: {
                  title: 'Envie uma mensagem',
                  layout: '2',
                  fields: [
                    { id: randomUUID(), type: 'text', label: 'Nome', placeholder: 'Seu nome', required: true },
                    { id: randomUUID(), type: 'text', label: 'Sobrenome', placeholder: 'Seu sobrenome', required: false },
                    { id: randomUUID(), type: 'email', label: 'Email', placeholder: 'seu@email.com', required: true },
                    { id: randomUUID(), type: 'tel', label: 'Telefone', placeholder: '(11) 90000-0000', required: false },
                    { id: randomUUID(), type: 'textarea', label: 'Mensagem', placeholder: 'Escreva sua mensagem', required: true }
                  ],
                  submitLabel: 'Enviar Formulário'
                }
              },
              {
                type: 'contact-info',
                data: {
                  titleHtml: '',
                  whatsappLabel: 'Fale comigo agora',
                  whatsappVariant: 'badge',
                  socialLinksTitle: '',
                  socialLinksVariant: 'icons'
                }
              }
            ]
          }
        ],
        settings: { background: 'none', padding: 'large', maxWidth: 'normal', anchorId: 'contato', customClass: 'section-contato' }
      }
    ]
  });

  await prisma.page.deleteMany();
  await prisma.page.create({
    data: {
      slug: 'home',
      pageKey: 'home',
      title: 'Alessandra Mazzieri | Terapia Junguiana Online para Mulheres 40+',
      description:
        'Terapia junguiana online para mulheres 40+ com Alessandra Mazzieri, psicoterapeuta junguiana. Atendimento discreto e profissional, em português.',
      layout: homeLayout as Prisma.InputJsonValue,
      status: 'published',
      publishedAt: new Date()
    }
  });

  await prisma.post.deleteMany();
}

main()
  .catch((error) => {
    logger.error({ err: error }, 'Seed failed');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
