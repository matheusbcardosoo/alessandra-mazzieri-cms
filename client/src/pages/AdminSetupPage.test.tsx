import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { SiteSettings } from '@/types';

const mockCreateFirstAdminAccount = vi.fn(async (_payload: { name: string; email: string; password: string }) => ({
  user: { id: 'u1', name: 'Ana', email: 'ana@example.com', role: 'admin' as const }
}));

const defaultSettings: SiteSettings = { siteName: 'Meu Site', socials: [] };
const mockUpdateSiteSettings = vi.fn(async (payload: SiteSettings) => payload);
const mockCreateNavbarItem = vi.fn(async (payload: Record<string, unknown>) => ({ id: `nav-${payload.pageKey}`, ...payload }));

let needsSetup = true;

vi.mock('@/api/queries', () => ({
  fetchSetupStatus: vi.fn(async () => ({ needsSetup })),
  createFirstAdminAccount: (payload: { name: string; email: string; password: string }) =>
    mockCreateFirstAdminAccount(payload),
  fetchSiteSettings: vi.fn(async () => ({})),
  fetchAdminSiteSettings: vi.fn(async () => defaultSettings),
  updateSiteSettings: (payload: SiteSettings) => mockUpdateSiteSettings(payload),
  createNavbarItem: (payload: Record<string, unknown>) => mockCreateNavbarItem(payload)
}));

import { AdminSetupPage } from './AdminSetupPage';

function setInputValue(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  nativeInputValueSetter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/setup']}>
        <Routes>
          <Route path="/admin/setup" element={<AdminSetupPage />} />
          <Route path="/admin/login" element={<div>LOGIN PAGE MARKER</div>} />
          <Route path="/admin" element={<div>DASHBOARD MARKER</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { container, root };
}

afterEach(() => {
  document.body.innerHTML = '';
  needsSetup = true;
  mockCreateFirstAdminAccount.mockClear();
  mockUpdateSiteSettings.mockClear();
  mockCreateNavbarItem.mockClear();
  localStorage.clear();
});

describe('AdminSetupPage', () => {
  test('redirects to /admin/login when setup was already completed', async () => {
    needsSetup = false;
    const { container, root } = renderPage();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('LOGIN PAGE MARKER');
    });
    root.unmount();
  });

  test('walks through account, settings and menu, then lands on the dashboard', async () => {
    const { container, root } = renderPage();

    await vi.waitFor(() => {
      expect(container.querySelector('input[name="name"]')).not.toBeNull();
    });

    setInputValue(container.querySelector('input[name="name"]')!, 'Ana');
    setInputValue(container.querySelector('input[name="email"]')!, 'ana@example.com');
    setInputValue(container.querySelector('input[name="password"]')!, 'segredo123');
    (container.querySelector('form button[type="submit"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(mockCreateFirstAdminAccount).toHaveBeenCalledWith({
        name: 'Ana',
        email: 'ana@example.com',
        password: 'segredo123'
      });
    });
    expect(localStorage.getItem('admin_authed')).toBe('1');

    await vi.waitFor(() => {
      expect(container.querySelector('input[name="siteName"]')).not.toBeNull();
    });

    setInputValue(container.querySelector('input[name="siteName"]')!, 'Estúdio Ana');
    (container.querySelector('form button[type="submit"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(mockUpdateSiteSettings).toHaveBeenCalledWith(expect.objectContaining({ siteName: 'Estúdio Ana' }));
    });

    await vi.waitFor(() => {
      expect(container.querySelector('input[name="homeLabel"]')).not.toBeNull();
    });

    (container.querySelector('form button[type="submit"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(mockCreateNavbarItem).toHaveBeenCalledWith(expect.objectContaining({ pageKey: 'home' }));
      expect(mockCreateNavbarItem).toHaveBeenCalledWith(expect.objectContaining({ pageKey: 'blog' }));
    });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('DASHBOARD MARKER');
    });

    root.unmount();
  });
});
