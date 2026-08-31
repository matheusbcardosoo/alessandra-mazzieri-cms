import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { sanitizeContent } from '../utils/sanitize';
import { normalizePageLayout } from '../utils/pageLayout';
import { logger } from '../config/logger';

async function main() {
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: env.ADMIN_EMAIL },
    update: { password: passwordHash, role: 'admin' },
    create: { email: env.ADMIN_EMAIL, password: passwordHash, name: env.ADMIN_EMAIL.split('@')[0], role: 'admin' }
  });

  await prisma.navItem.deleteMany();
  const navSeed: Prisma.NavItemCreateManyInput[] = [
    {
      label: 'Home',
      type: 'INTERNAL_PAGE',
      pageKey: 'home',
      isParent: true,
      showInNavbar: true,
      showInFooter: true,
      orderNavbar: 0,
      orderFooter: 0,
      isVisible: true
    },
    {
      label: 'Sobre',
      type: 'INTERNAL_PAGE',
      pageKey: 'sobre',
      isParent: true,
      showInNavbar: true,
      showInFooter: true,
      orderNavbar: 1,
      orderFooter: 1,
      isVisible: true
    },
    {
      label: 'Blog',
      type: 'INTERNAL_PAGE',
      pageKey: 'blog',
      isParent: true,
      showInNavbar: true,
      showInFooter: false,
      orderNavbar: 2,
      orderFooter: null,
      isVisible: true
    },
    {
      label: 'Contato',
      type: 'INTERNAL_PAGE',
      pageKey: 'contato',
      isParent: true,
      showInNavbar: true,
      showInFooter: true,
      orderNavbar: 3,
      orderFooter: 3,
      isVisible: true
    }
  ];

  await prisma.navItem.createMany({
    data: navSeed
  });

  await prisma.homeSection.deleteMany();
  await prisma.homeSection.createMany({
    data: [
      {
        type: 'hero',
        title: 'Bem-vinda',
        order: 0,
        data: {
          eyebrow: 'Consultoria estratégica',
          heading: 'Decisões melhores, resultados mais rápidos',
          subheading:
            'Apoio especializado para você estruturar processos, tomar decisões com confiança e crescer com previsibilidade.',
          ctaLabel: 'Agendar conversa',
          ctaHref: '/contato'
        }
      },
      {
        type: 'services',
        title: 'Como posso ajudar',
        order: 1,
        data: {
          items: [
            {
              title: 'Consultoria individual',
              description: 'Apoio para planejamento, organização e tomada de decisão.'
            },
            {
              title: 'Consultoria para equipes',
              description: 'Alinhamento de processos, comunicação e metas em grupo.'
            },
            {
              title: 'Atendimento online',
              description: 'Sessões seguras e confortáveis, no seu ritmo e em qualquer lugar.'
            }
          ]
        }
      },
      {
        type: 'cta',
        title: 'Pronto para dar o próximo passo?',
        order: 2,
        data: {
          text: 'Agende uma conversa inicial e entenda como posso apoiar você agora.',
          ctaLabel: 'Agendar conversa',
          ctaHref: '/contato'
        }
      }
    ]
  });

  await prisma.page.deleteMany();
  const aboutLayout = normalizePageLayout({
    version: 1,
    columns: 2,
    cols: [
      {
        blocks: [
          {
            type: 'text',
            data: {
              contentHtml: sanitizeContent(
                '<h2>Um jeito próximo e humano de trabalhar</h2><p>Ofereço atendimento especializado para apoiar você em momentos de decisão, com clareza e direção baseadas em experiência prática.</p>'
              ),
              width: 'wide'
            }
          },
          {
            type: 'button',
            data: {
              label: 'Agendar uma conversa',
              href: 'https://wa.me/5500000000000',
              newTab: true,
              variant: 'primary'
            }
          }
        ]
      },
      {
        blocks: [
          {
            type: 'image',
            data: {
              mediaId: null,
              src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
              alt: 'Foto profissional',
              size: 100,
              align: 'center',
              caption: 'Foto institucional'
            }
          }
        ]
      }
    ]
  });

  const contactLayout = normalizePageLayout({
    version: 1,
    columns: 1,
    cols: [
      {
        blocks: [
          {
            type: 'text',
            data: {
              contentHtml: sanitizeContent(
                '<h2>Vamos conversar?</h2><p>Envie sua mensagem e retornarei em até 1 dia útil. Atendimento online para todo o Brasil.</p>'
              ),
              background: 'soft'
            }
          },
          {
            type: 'button',
            data: {
              label: 'Falar pelo WhatsApp',
              href: 'https://wa.me/5500000000000',
              newTab: true,
              variant: 'secondary'
            }
          }
        ]
      }
    ]
  });

  await prisma.page.createMany({
    data: [
      {
        slug: 'sobre',
        title: 'Sobre',
        description: 'Conheça a experiência e a abordagem de trabalho',
        layout: aboutLayout as Prisma.InputJsonValue,
        status: 'published',
        publishedAt: new Date()
      },
      {
        slug: 'contato',
        title: 'Contato',
        description: 'Canais para agendar uma conversa ou tirar dúvidas',
        layout: contactLayout as Prisma.InputJsonValue,
        status: 'published',
        publishedAt: new Date()
      }
    ]
  });

  await prisma.post.deleteMany();
  await prisma.post.createMany({
    data: [
      {
        title: 'Como estruturar decisões em momentos de mudança',
        slug: 'decisoes-em-momentos-de-mudanca',
        excerpt:
          'Transições exigem clareza. Veja passos práticos para atravessar essas fases com mais segurança.',
        content: sanitizeContent(
          '<p>Mudanças trazem incertezas. Um bom processo de decisão oferece um caminho claro para reorganizar prioridades e fortalecer seus próximos passos.</p>'
        ),
        status: 'published',
        isFeatured: true,
        views: 124,
        tags: ['transicoes', 'planejamento'],
        publishedAt: new Date()
      },
      {
        title: 'Produtividade: sinais de sobrecarga e como agir',
        slug: 'produtividade-sinais-e-como-agir',
        excerpt: 'Reconheça os sinais de sobrecarga e caminhos possíveis para recuperar o equilíbrio.',
        content: sanitizeContent(
          '<p>Sobrecarga não precisa dominar sua rotina. Pequenos ajustes diários aliados a um bom planejamento podem transformar sua relação com o tempo.</p>'
        ),
        status: 'published',
        isFeatured: true,
        views: 98,
        tags: ['produtividade', 'bem-estar'],
        publishedAt: new Date()
      }
    ]
  });
}

main()
  .catch((error) => {
    logger.error({ err: error }, 'Seed failed');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
