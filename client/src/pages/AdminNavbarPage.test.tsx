import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { NavbarItem } from '@/types';

const navItems: NavbarItem[] = [
  {
    id: 'home-id',
    label: 'Home',
    type: 'INTERNAL_PAGE',
    pageKey: 'home',
    isParent: true,
    showInNavbar: true,
    showInFooter: true,
    parentId: null,
    orderNavbar: 0,
    orderFooter: 0,
    isVisible: true
  },
  {
    id: 'sobre-id',
    label: 'Sobre',
    type: 'INTERNAL_PAGE',
    pageKey: 'sobre',
    isParent: true,
    showInNavbar: true,
    showInFooter: true,
    parentId: null,
    orderNavbar: 1,
    orderFooter: 1,
    isVisible: true
  }
];

vi.mock('@/api/queries', () => ({
  fetchAdminNavbar: vi.fn(async () => navItems),
  fetchAdminPages: vi.fn(async () => []),
  fetchAdminSiteSettings: vi.fn(async () => ({})),
  createNavbarItem: vi.fn(),
  updateNavbarItem: vi.fn(),
  deleteNavbarItem: vi.fn(),
  reorderNavbarItems: vi.fn(),
  // AdminNavbarPage renders <SeoHead>, which also imports from '@/api/queries' (fetchSiteSettings)
  // to resolve the site name for document.title.
  fetchSiteSettings: vi.fn(async () => ({}))
}));

import { AdminNavbarPage } from './AdminNavbarPage';

function renderPage(queryClient: QueryClient) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminNavbarPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { container, root };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('AdminNavbarPage', () => {
  test('renders items immediately when the navbar query is already cached on mount', async () => {
    // Reproduces navigating to /admin/navbar client-side after it was already
    // visited earlier in the session (e.g. via the sidebar link) — the
    // ['admin','navbar'] query is warm, so useAdminNavbar() returns data
    // synchronously on the very first render instead of starting as undefined.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(['admin', 'navbar'], navItems);

    const { container, root } = renderPage(queryClient);

    await vi.waitFor(() => {
      expect(container.textContent).not.toContain('Nenhum item na navegação.');
      expect(container.textContent).toContain('Home');
      expect(container.textContent).toContain('Sobre');
    });

    root.unmount();
  });
});
