import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createHomePageIfNotExists() {
  console.log('Verificando página Home...');

  try {
    // Verificar se já existe
    const existing = await prisma.page.findUnique({
      where: { slug: 'home' }
    });

    if (existing) {
      console.log('✓ Página Home já existe');
      
      // Garantir que tem pageKey
      if (!existing.pageKey) {
        await prisma.page.update({
          where: { id: existing.id },
          data: { pageKey: 'home' }
        });
        console.log('✓ pageKey "home" adicionado');
      }
      
      return;
    }

    // Criar página Home
    const homePage = await prisma.page.create({
      data: {
        slug: 'home',
        pageKey: 'home',
        title: 'Página Inicial',
        description: 'Página inicial do site',
        status: 'published',
        publishedAt: new Date(),
        layout: {
          version: 2,
          sections: [
            {
              id: 'hero-section',
              columns: 1,
              cols: [
                {
                  id: 'col-1',
                  blocks: [
                    {
                      id: 'hero-block',
                      type: 'hero',
                      isLocked: true,
                      data: {
                        heading: '[Título de impacto sobre o seu negócio]',
                        subheading: '[Descreva em 1-2 frases o que você oferece e para quem]',
                        ctaLabel: 'Agendar sessão',
                        ctaHref: '/contato',
                        secondaryCta: 'Conhecer a abordagem',
                        secondaryHref: '/sobre',
                        badges: ['Diferencial 1', 'Diferencial 2', 'Diferencial 3']
                      },
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    }
                  ]
                }
              ],
              settings: {}
            }
          ]
        }
      }
    });

    console.log(`✓ Página Home criada (ID: ${homePage.id})`);
  } catch (error) {
    console.error('Erro ao criar página Home:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createHomePageIfNotExists()
  .then(() => {
    console.log('✓ Script executado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Erro ao executar script:', error);
    process.exit(1);
  });
