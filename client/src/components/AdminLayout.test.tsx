import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import * as useCurrentUserModule from '../hooks/queries/useCurrentUser';
import * as useAdminThemeModule from '../hooks/useAdminTheme';

vi.spyOn(useAdminThemeModule, 'useAdminTheme').mockReturnValue({
  siteName: 'Site',
  initials: 'S',
  themeCssVars: {},
  isLoading: false
} as unknown as ReturnType<typeof useAdminThemeModule.useAdminTheme>);

function renderLayout(user: Partial<import('../types').User>) {
  vi.spyOn(useCurrentUserModule, 'useCurrentUser').mockReturnValue(
    { data: user, isSuccess: true } as unknown as ReturnType<typeof useCurrentUserModule.useCurrentUser>
  );
  const qc = new QueryClient();
  const router = createMemoryRouter(
    [{ path: '/admin', element: <AdminLayout />, children: [{ index: true, element: <div>content</div> }] }],
    { initialEntries: ['/admin'] }
  );
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe('AdminLayout sidebar', () => {
  it('shows every section for admin, including Usuários', () => {
    renderLayout({ role: 'admin', sectionAccess: { blog: false, menu: false, media: false, forms: false, settings: false }, canAccessHome: true });
    expect(screen.getByText('Usuários')).toBeInTheDocument();
    expect(screen.getByText('Blog')).toBeInTheDocument();
    expect(screen.getByText('Página inicial')).toBeInTheDocument();
  });

  it('hides ungranted sections and Usuários for an editor', () => {
    renderLayout({
      role: 'editor',
      sectionAccess: { blog: true, menu: false, media: false, forms: false, settings: false },
      canAccessHome: false
    });
    expect(screen.getByText('Blog')).toBeInTheDocument();
    expect(screen.getByText('Artigos')).toBeInTheDocument();
    expect(screen.queryByText('Barra de navegação')).not.toBeInTheDocument();
    expect(screen.queryByText('Imagens')).not.toBeInTheDocument();
    expect(screen.queryByText('Página inicial')).not.toBeInTheDocument();
    expect(screen.queryByText('Usuários')).not.toBeInTheDocument();
    // Sempre visíveis, sem toggle:
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Páginas')).toBeInTheDocument();
    expect(screen.getByText('Ajuda')).toBeInTheDocument();
  });
});
