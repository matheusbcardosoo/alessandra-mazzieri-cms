import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().default(process.env.PORT ? parseInt(process.env.PORT) : 4000),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://postgres:postgres@localhost:5432/app_db'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  SUPABASE_STORAGE_BUCKET: z.string().default('site-media'),
  REDIS_URL: z.string().optional(),
  REDIS_PREFIX: z.string().default('web-cms-template'),
  CACHE_TTL_NAV: z.coerce.number().default(3600),
  CACHE_TTL_HOME: z.coerce.number().default(3600),
  CACHE_TTL_BLOG: z.coerce.number().default(3600),
  CACHE_TTL_PAGE: z.coerce.number().default(600),
  CACHE_TTL_POST: z.coerce.number().default(600),
  CACHE_TTL_POSTS_LIST: z.coerce.number().default(600),
  // Janela de deduplicação de visualizações de post por (post, IP) — evita que
  // requisições repetidas ao mesmo post invalidem o cache dele e inflem a
  // contagem de views a cada reload/refresh.
  CACHE_TTL_VIEW_DEDUPE: z.coerce.number().default(1800),
  // Quantas versões publicadas de cada página são mantidas no histórico
  // (server/src/services/pageVersion.service.ts) — ao exceder, as mais
  // antigas são descartadas.
  PAGE_VERSION_HISTORY_LIMIT: z.coerce.number().default(10),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().default(5),
  ALLOWED_IMAGE_MIME_TYPES: z.string().default('image/jpeg,image/png,image/webp'),
  // URL canônica pública do site (sem barra final), usada em robots.txt,
  // sitemap.xml, llms.txt e no redirect 301 www/non-www (Fase 4, docs/plano-template.md).
  SITE_URL: z.string().url().default('http://localhost:5173'),
  // Sinaliza em robots.txt (Content-Signal: ai-train) se bots de IA podem usar
  // o conteúdo do site para treinar modelos. "no" por padrão — indexação e uso
  // por agentes (busca/RAG) continuam liberados independente desta flag.
  AI_TRAINING_ALLOWED: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SENTRY_DSN: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
