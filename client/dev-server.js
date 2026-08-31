// Servidor de desenvolvimento com SSR.
//
// Substitui o antigo `vite dev` puro (CSR): cria o Vite em middleware mode
// (HMR, transformação de módulos, etc. continuam iguais) e, para qualquer
// rota que não seja um asset, renderiza a árvore React no servidor via
// entry-server.tsx antes de mandar o HTML pro browser — assim o `npm run
// dev` já reproduz o mesmo comportamento de SSR que roda em produção.
//
// A API continua sendo o processo separado em `server/` (porta 4000); o
// proxy de `/api` para lá vem do `server.proxy` já configurado em
// vite.config.ts e funciona normalmente em middleware mode.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.CLIENT_PORT || process.env.PORT || 5173);
const API_PORT = process.env.API_PORT || 4000;

// Usado por client/src/api/client.ts quando import.meta.env.SSR é true.
process.env.INTERNAL_API_URL = process.env.INTERNAL_API_URL || `http://127.0.0.1:${API_PORT}`;

async function createDevServer() {
  const app = express();

  const vite = await createViteServer({
    root: __dirname,
    server: { middlewareMode: true },
    appType: 'custom'
  });

  app.use(vite.middlewares);

  app.use(async (req, res, next) => {
    const url = req.originalUrl;

    // Já deveria ter sido interceptado pelo proxy do Vite (server.proxy em
    // vite.config.ts). Se chegou aqui, não tem o que renderizar como HTML.
    if (url.startsWith('/api')) return next();

    try {
      const templatePath = path.resolve(__dirname, 'index.html');
      const rawTemplate = await fs.readFile(templatePath, 'utf-8');
      const template = await vite.transformIndexHtml(url, rawTemplate);

      // /admin é sempre CSR puro — ver PublicRoutes.tsx para o motivo (evita
      // puxar dependências do editor admin, que não são SSR-safe, pro bundle
      // de SSR). O client hidrata e resolve a UI de autenticação sozinho.
      if (req.path.startsWith('/admin')) {
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        return;
      }

      const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
      const origin = `${req.protocol}://${req.get('host')}`;
      const { appHtml, headHtml, stateScript, statusCode } = await render(url, origin);

      const html = template
        .replace('<!--ssr-head-->', headHtml)
        .replace('<!--ssr-outlet-->', appHtml)
        .replace('<!--ssr-state-->', stateScript);

      res.status(statusCode).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (error) {
      vite.ssrFixStacktrace(error);
      // eslint-disable-next-line no-console
      console.error('[dev-server] Erro ao renderizar SSR:', error);
      next(error);
    }
  });

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`SSR dev server: http://localhost:${PORT} (API em http://127.0.0.1:${API_PORT})`);
  });
}

createDevServer();
