import { initSentry } from './config/sentry';
import { app } from './app';
import { env } from './config/env';
import { storageProvider } from './config/storage';
import { logger } from './config/logger';

initSentry();

const port = env.PORT;

async function bootstrap() {
  try {
    await storageProvider.ensureBucketExists();
  } catch (error) {
    // Não derruba o boot: como o cache (Redis), storage segue com
    // graceful degradation — o site funciona, só uploads de mídia falham
    // até o bucket ser criado (manualmente ou corrigindo as credenciais).
    logger.error({ err: error }, '[storage] Failed to ensure media bucket exists');
  }

  app.listen(port, () => {
    logger.info(`API running on http://localhost:${port}`);
  });
}

bootstrap();
