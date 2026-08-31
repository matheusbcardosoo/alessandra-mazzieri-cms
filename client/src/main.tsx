import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { initSentry, Sentry } from './config/sentry';

initSentry();

const container = document.getElementById('root')!;
const app = (
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Algo deu errado. Recarregue a página.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);

// /admin é servido como shell CSR puro, sem SSR (ver server.js e
// client/dev-server.js, que respondem a /admin* com o index.html estático,
// deixando #root vazio — ver comentário em PublicRoutes.tsx). Hidratar esse
// container vazio como se tivesse markup do servidor sempre falha (mismatch
// na raiz) e corrompe a árvore, deixando páginas do admin em branco. Nas
// demais rotas o servidor (SSR) sempre renderiza o HTML de #root antes de
// enviar a resposta — por isso hidratamos em vez de montar do zero: evita o
// "flash" de tela em branco e reaproveita o HTML que o crawler/usuário já
// recebeu pronto.
if (window.location.pathname.startsWith('/admin')) {
  createRoot(container).render(app);
} else {
  hydrateRoot(container, app);
}
