import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, test, vi } from 'vitest';
import { PublicLayout } from './PublicLayout';

vi.mock('../api/queries', () => ({
  fetchSiteSettings: vi.fn(() => new Promise(() => {}))
}));

vi.mock('./Navbar', () => ({
  Navbar: () => <nav data-testid="navbar" />
}));

vi.mock('./Footer', () => ({
  Footer: () => <footer data-testid="footer" />
}));

vi.mock('./WhatsAppFloatingButton', () => ({
  WhatsAppFloatingButton: () => <aside data-testid="whatsapp" />
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Outlet: () => <section data-testid="outlet" />
  };
});

describe('PublicLayout', () => {
  test('shows a neutral loading screen until site settings are loaded', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <PublicLayout />
      </QueryClientProvider>
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('Carregando site');
    expect(html).toContain('newtons-cradle');
    expect(html).not.toContain('class="app-shell"');
    expect(html).not.toContain('--color-paper');
  });

  test('keeps the loading animation at least two seconds long', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <PublicLayout />
      </QueryClientProvider>
    );
    const speedDeclaration = html.match(/--uib-speed:([0-9.]+)s/);

    expect(speedDeclaration).not.toBeNull();
    expect(Number(speedDeclaration?.[1])).toBeGreaterThanOrEqual(2);
  });
});
