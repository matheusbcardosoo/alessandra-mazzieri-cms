import { QueryClient } from '@tanstack/react-query';

const clientDefaultOptions = {
  queries: {
    // SSR já entrega os dados "frescos" via dehydrate/hydrate; evita um
    // refetch imediato no client logo após a hidratação.
    staleTime: 30 * 1000
  }
} as const;

const serverDefaultOptions = {
  queries: {
    staleTime: 30 * 1000,
    // No client, retry (3 tentativas + backoff) ajuda com instabilidade de
    // rede do visitante. No servidor isso é só prejuízo: cada SSR já é uma
    // tentativa única e "fresca" por requisição, então uma API fora do ar
    // vira ~7s de retries por query em vez de falhar em milissegundos e
    // cair no fallback (ver prefetchRoute.ts) — o request inteiro trava.
    retry: false
  }
} as const;

/**
 * No browser, precisamos de uma única instância por aba (senão o cache do
 * React Query "reseta" a cada re-render do App). No server, o oposto: cada
 * requisição precisa da sua própria instância, senão os dados de um
 * visitante vazam para outro. `getQueryClient` cobre os dois casos.
 */
export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    return new QueryClient({ defaultOptions: serverDefaultOptions });
  }

  if (!browserQueryClient) {
    browserQueryClient = new QueryClient({ defaultOptions: clientDefaultOptions });
  }
  return browserQueryClient;
}

let browserQueryClient: QueryClient | undefined;
