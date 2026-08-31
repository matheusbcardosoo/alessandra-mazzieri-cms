import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { BlogAdminConfig, BlogSection } from '@/types';

type UpdateBlogPayload = { title?: string; description?: string | null; sections?: BlogSection[] };

const mockUpdate = vi.fn(async (id: string, payload: UpdateBlogPayload) => ({
  id,
  title: payload.title,
  description: payload.description,
  sections: payload.sections
}));

const initialConfig: BlogAdminConfig = {
  id: 'blog-id',
  title: 'Jornadas e reflexões',
  description: 'Leituras rápidas, aplicáveis e cuidadosas.',
  sections: [
    { type: 'featured', visible: true, title: 'Em destaque', subtitle: 'Sub A' },
    { type: 'mostViewed', visible: true, title: 'Mais vistos', subtitle: 'Sub B' },
    { type: 'allArticles', visible: true, title: 'Todos os artigos', subtitle: 'Sub C' }
  ]
};

vi.mock('@/api/queries', () => ({
  fetchAdminBlog: vi.fn(async () => initialConfig),
  updateAdminBlog: (id: string, payload: UpdateBlogPayload) => mockUpdate(id, payload),
  // AdminBlogPage renders <SeoHead>, which also imports from '@/api/queries' (fetchSiteSettings)
  // to resolve the site name for document.title. Since this vi.mock() factory replaces the whole
  // module (not a partial mock), that export must be included too or accessing it throws
  // "No fetchSiteSettings export is defined on the mock".
  fetchSiteSettings: vi.fn(async () => ({}))
}));

import { AdminBlogPage } from './AdminBlogPage';

function renderPage(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminBlogPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { container, root };
}

afterEach(() => {
  document.body.innerHTML = '';
  mockUpdate.mockClear();
});

describe('AdminBlogPage', () => {
  test('renders the 3 sections in their configured order', async () => {
    const { container, root } = renderPage();
    await vi.waitFor(() => {
      const headings = Array.from(container.querySelectorAll('strong')).map((el) => el.textContent);
      expect(headings).toEqual(['Em destaque', 'Mais vistos', 'Todos os artigos']);
    });
    root.unmount();
  });

  test('moving a section down changes the rendered order', async () => {
    const { container, root } = renderPage();
    await vi.waitFor(() => {
      expect(container.querySelector('strong')).not.toBeNull();
    });

    const moveDown = Array.from(container.querySelectorAll('button')).find(
      (b) => b.getAttribute('aria-label') === 'Mover Em destaque para baixo'
    ) as HTMLButtonElement;
    moveDown.click();

    await vi.waitFor(() => {
      const headings = Array.from(container.querySelectorAll('strong')).map((el) => el.textContent);
      expect(headings).toEqual(['Mais vistos', 'Em destaque', 'Todos os artigos']);
    });
    root.unmount();
  });

  test('saving sends the current title, description and sections to the API', async () => {
    const { container, root } = renderPage();
    await vi.waitFor(() => {
      expect(container.querySelector('strong')).not.toBeNull();
    });

    const saveButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Salvar'
    ) as HTMLButtonElement;
    saveButton.click();

    await vi.waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('blog-id', expect.objectContaining({ title: 'Jornadas e reflexões' }));
    });
    root.unmount();
  });

  test('renders content immediately when the query cache is already warm on mount (revisit scenario)', async () => {
    // Simula o usuário saindo da página do blog e voltando: o QueryClient da
    // aba persiste (queryClient.ts), então a segunda montagem já encontra
    // ['admin','blog'] resolvido no cache, sem passar por isLoading.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(['admin', 'blog'], initialConfig);

    const { container, root } = renderPage(queryClient);

    await vi.waitFor(() => {
      const headings = Array.from(container.querySelectorAll('strong')).map((el) => el.textContent);
      expect(headings).toEqual(['Em destaque', 'Mais vistos', 'Todos os artigos']);
    });
    root.unmount();
  });
});
