import { randomBytes } from 'node:crypto';
import express, { type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { routes } from './routes';
import { errorHandler } from './middleware/error';
import { apiRateLimit } from './middleware/rateLimit';
import { canonicalHostRedirect } from './middleware/canonicalHost';
import { requestId } from './middleware/requestId';
import { env } from './config/env';
import { sendSuccess } from './utils/responses';
import { getHealthStatus } from './utils/health';

const app = express();
const supabaseOrigin = new URL(env.SUPABASE_URL).origin;
const cspDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();

// Desabilitar ETag para evitar 304 Not Modified
app.disable('etag');

// Necessario em ambientes atras de proxy (EasyPanel/NGINX/Traefik)
// para IP correto em rate limit e logs.
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Antes de qualquer outra coisa: canonicaliza o host (www ↔ non-www).
// Em produção (server.js) o mesmo middleware compilado também roda antes
// dos arquivos estáticos, para cobrir /assets também.
app.use(canonicalHostRedirect);

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);

// Gera um nonce por request para liberar os <script> inline que o SSR escreve
// (estado hidratado do React Query e JSON-LD) sem precisar de 'unsafe-inline'.
// server.js (produção) lê `res.locals.cspNonce` e repassa pro entry-server.tsx,
// que usa o mesmo valor no atributo `nonce` das tags — por isso o valor tem
// que estar pronto antes do helmet montar o header (feito aqui, antes do
// middleware de CSP). client/dev-server.js não passa por este app (roda em
// processo/porta separados) e não aplica CSP nenhum, então não precisa disso.
app.use((_req, res, next) => {
  res.locals.cspNonce = randomBytes(16).toString('base64');
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...cspDirectives,
        'img-src': ["'self'", 'data:', 'blob:', supabaseOrigin],
        'script-src': ["'self'", (_req, res) => `'nonce-${(res as Response).locals.cspNonce}'`],
        // Origens dos embeds de vídeo do editor (RichTextEditor/extensions/videoEmbed.ts)
        'frame-src': ["'self'", 'https://www.youtube-nocookie.com', 'https://www.tiktok.com', 'https://www.instagram.com']
      }
    }
  })
);
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestId);
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'tiny'));

// Rotas admin: sem cache (comportamento atual)
app.use('/api/admin', (_req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// Rotas de autenticação: sem cache
app.use('/api/login', (_req, res, next) => {
  res.set({ 'Cache-Control': 'no-store' });
  next();
});
app.use('/api/logout', (_req, res, next) => {
  res.set({ 'Cache-Control': 'no-store' });
  next();
});
app.use('/api/setup', (_req, res, next) => {
  res.set({ 'Cache-Control': 'no-store' });
  next();
});

// Rotas públicas com dados estáveis: cache de 60s no browser
// (o servidor já usa Redis/memory cache interno; o browser cache é adicional)
app.use('/api/public', (_req, res, next) => {
  // Permite cache de 60s no browser mas revalida
  res.set({ 'Cache-Control': 'public, max-age=60, stale-while-revalidate=30' });
  next();
});

// robots.txt, sitemap.xml e llms.txt: mesmo tratamento de cache de browser
// que as demais rotas públicas — o conteúdo em si já é cacheado no servidor
// (SeoService, ver config/cache.ts) e regenerado a cada publicação.
app.use(['/robots.txt', '/sitemap.xml', '/llms.txt'], (_req, res, next) => {
  res.set({ 'Cache-Control': 'public, max-age=60, stale-while-revalidate=30' });
  next();
});

app.use(apiRateLimit);

app.get('/api/health', async (_req, res) => {
  const health = await getHealthStatus();
  return sendSuccess(res, health, health.status === 'ok' ? 200 : 503);
});

app.use(routes);

app.use(errorHandler);

export { app };
