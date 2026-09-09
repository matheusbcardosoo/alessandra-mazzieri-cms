import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { QueryClientProvider, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { ToastProvider } from './components/Toast';
import { PublicRoutes } from './routes/PublicRoutes';
import { getQueryClient } from './queryClient';
import { prefetchRoute } from './ssr/prefetchRoute';
import { buildSeoHead } from './ssr/seo';

export type RenderResult = {
  appHtml: string;
  headHtml: string;
  stateScript: string;
  statusCode: number;
};

/**
 * Ponto de entrada de SSR. Recebe a URL da requisição (path+query) e a
 * origin (protocolo+host, calculada pelo Express a partir do request) e
 * devolve o HTML da árvore React já renderizada, as tags de <head> e o
 * script com o estado do React Query para hidratação no client.
 *
 * Usado tanto pelo dev server (client/dev-server.js, via vite.ssrLoadModule)
 * quanto pelo build de produção (dist/server/entry-server.js, importado
 * pelo server.js da raiz).
 *
 * Só conhece as rotas públicas (PublicRoutes, não AppRoutes) — o admin é
 * sempre servido como shell CSR pelo caller (ver comentário em
 * routes/PublicRoutes.tsx). Se `render` for chamado com uma URL de admin
 * por engano, devolve o mesmo shell sem tentar casar rota nenhuma.
 *
 * `nonce` é o valor gerado por request em `res.locals.cspNonce`
 * (server/src/app.ts) — usado nos <script> inline abaixo para casar com o
 * CSP `script-src` em produção. Em dev não há CSP, então vem `undefined`.
 */
export async function render(url: string, origin: string, nonce?: string): Promise<RenderResult> {
  const pathname = url.split('?')[0] || '/';
  const queryClient = getQueryClient();

  const { statusCode, seo, siteSettings } = await prefetchRoute(pathname, origin, queryClient);

  const appHtml = renderToString(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <ToastProvider>
            <StaticRouter location={url}>
              <PublicRoutes />
            </StaticRouter>
          </ToastProvider>
        </HydrationBoundary>
      </QueryClientProvider>
    </StrictMode>
  );

  const headHtml = buildSeoHead({
    title: seo.title,
    description: seo.description,
    origin,
    pathname,
    siteSettings,
    extraJsonLd: seo.extraJsonLd,
    noIndex: seo.noIndex,
    appendSiteName: seo.appendSiteName,
    nonce
  });

  const nonceAttr = nonce ? ` nonce="${nonce}"` : '';
  const dehydratedState = dehydrate(queryClient);
  const stateScript = `<script${nonceAttr}>window.__REACT_QUERY_STATE__ = ${JSON.stringify(dehydratedState).replace(
    /</g,
    '\\u003c'
  )};</script>`;

  return { appHtml, headHtml, stateScript, statusCode };
}
