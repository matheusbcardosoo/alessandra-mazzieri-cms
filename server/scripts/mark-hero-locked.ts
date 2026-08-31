import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function markHeroAsLocked() {
  console.log('Marcando Hero como bloqueado...');
  
  try {
    const result = await prisma.homeSection.updateMany({
      where: {
        type: 'hero'
      },
      data: {
        isLocked: true,
        order: 0
      }
    });

    console.log(`✓ ${result.count} seção(ões) Hero marcada(s) como bloqueada(s)`);
  } catch (error) {
    console.error('Erro ao marcar Hero:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

markHeroAsLocked()
  .then(() => {
    console.log('✓ Script executado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Erro ao executar script:', error);
    process.exit(1);
  });
