import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { usePageEditor } from './usePageEditor';
import type { Page } from '@/types';
import * as queries from '@/api/queries';

const samplePage: Page = {
  id: 'page-1',
  slug: 'sobre',
  pageKey: null,
  title: 'Sobre nós',
  description: '',
  status: 'draft',
  layout: { version: 2, sections: [{ id: 'sec-1', kind: 'normal', columns: 1, cols: [{ id: 'col-1', blocks: [] }] }] }
};

vi.spyOn(queries, 'fetchAdminPage').mockResolvedValue(samplePage);

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe('usePageEditor', () => {
  it('loads the page content into the form when the query cache is already warm on mount (revisit scenario)', async () => {
    // Simula o usuário saindo do editor e voltando: o QueryClient da aba
    // persiste (queryClient.ts é um singleton por aba), então a segunda
    // montagem já encontra ['admin','page',id] resolvido no cache, sem
    // passar por isLoading.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(['admin', 'page', 'page-1'], samplePage);

    const { result } = renderHook(() => usePageEditor('page-1', undefined), {
      wrapper: makeWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.page.title).toBe('Sobre nós');
    });
    expect(result.current.page.layout.sections).toHaveLength(1);
  });
});
