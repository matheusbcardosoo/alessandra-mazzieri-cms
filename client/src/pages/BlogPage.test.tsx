import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { Article } from '@/types';

vi.mock('@/components/SeoHead', () => ({ SeoHead: () => null }));

function makeArticle(overrides: Partial<Article>): Article {
  return {
    id: overrides.id ?? 'a1',
    title: overrides.title ?? 'Artigo',
    slug: overrides.slug ?? 'artigo',
    excerpt: '',
    content: '',
    tags: [],
    status: 'published',
    isFeatured: false,
    views: 0,
    ...overrides
  };
}

const featured = [makeArticle({ id: 'f1', title: 'Destaque 1', slug: 'destaque-1' })];
const mostViewed = [makeArticle({ id: 'm1', title: 'Mais visto 1', slug: 'mais-visto-1' })];
const allArticlesResult = {
  items: [makeArticle({ id: 'a1', title: 'Artigo recente', slug: 'artigo-recente' })],
  total: 1,
  page: 1,
  limit: 6,
  totalPages: 1
};
const searchResult = {
  items: [makeArticle({ id: 's1', title: 'Resultado da busca', slug: 'resultado-busca' })],
  total: 1,
  page: 1,
  limit: 6,
  totalPages: 1
};

const fetchBlogHomeMock = vi.fn(async () => ({
  featured,
  mostViewed,
  latest: allArticlesResult,
  title: 'Jornadas e reflexões',
  description: 'Leituras rápidas, aplicáveis e cuidadosas.',
  sections: [
    { type: 'mostViewed', visible: true, title: 'Mais vistos', subtitle: 'Sub B' },
    { type: 'featured', visible: true, title: 'Em destaque', subtitle: 'Sub A' }
  ]
}));

const fetchArticlesMock = vi.fn(async (filters?: { search?: string }) => (filters?.search ? searchResult : allArticlesResult));

vi.mock('@/api/queries', () => ({
  fetchBlogHome: () => fetchBlogHomeMock(),
  // Typed to match fetchArticlesMock's signature directly (the brief's `unknown` param
  // fails strict typecheck under this project's noImplicitAny/strict settings).
  fetchArticles: (filters?: { search?: string }) => fetchArticlesMock(filters)
}));

import { BlogPage } from './BlogPage';

function renderPage() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  root.render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BlogPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { container, root };
}

afterEach(() => {
  document.body.innerHTML = '';
  fetchBlogHomeMock.mockClear();
  fetchArticlesMock.mockClear();
});

describe('BlogPage', () => {
  test('renders sections in the order returned by the config, not the hardcoded order', async () => {
    const { container, root } = renderPage();
    await vi.waitFor(() => {
      const headings = Array.from(container.querySelectorAll('h2')).map((el) => el.textContent);
      expect(headings[0]).toBe('Mais vistos');
      expect(headings[1]).toBe('Em destaque');
    });
    root.unmount();
  });

  test('forces the all-articles list when searching, even without that section in the config', async () => {
    const { container, root } = renderPage();
    await vi.waitFor(() => {
      expect(container.querySelector('input[aria-label="Buscar por título ou tema"]')).not.toBeNull();
    });

    const input = container.querySelector('input[aria-label="Buscar por título ou tema"]') as HTMLInputElement;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    nativeInputValueSetter.call(input, 'algo');
    input.dispatchEvent(new Event('input', { bubbles: true }));

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Resultado da busca');
      expect(container.textContent).not.toContain('Destaque 1');
      expect(container.textContent).not.toContain('Mais visto 1');
      expect(container.textContent).toContain('Todos os artigos');
    });
    root.unmount();
  });
});
