import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { QueryClientProvider, HydrationBoundary } from '@tanstack/react-query';
import { ToastProvider } from './components/Toast';
import { appRoutes } from './routes/AppRoutes';
import { getQueryClient } from './queryClient';
import { getInitialDehydratedState } from './ssr/hydrationState';
import './public.css';
import './legacy.css';

/**
 * Data router: precisa ser criado fora do componente (senão o React
 * recriaria o router — e perderia o estado de navegação — a cada render).
 * Um data router (em vez de <BrowserRouter> simples) é obrigatório aqui
 * porque o editor de páginas usa useBlocker, ver comentário em
 * routes/AppRoutes.tsx.
 */
const router = createBrowserRouter(appRoutes);

/**
 * Entrada usada apenas no client (hidratação/CSR puro). O SSR usa
 * entry-server.tsx, que monta as rotas públicas (PublicRoutes.tsx) dentro
 * de um <StaticRouter> e de um QueryClient próprio da requisição — o admin
 * (e portanto o data router acima) nunca roda no servidor.
 *
 * O HydrationBoundary reidrata o cache do React Query a partir do estado
 * que o servidor embutiu no HTML — assim o primeiro render do client já
 * encontra os dados prontos, sem refetch nem "flash" de loading.
 */
function App() {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <HydrationBoundary state={getInitialDehydratedState()}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}

export default App;
