import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminUsersPage } from './AdminUsersPage';
import * as useUsersModule from '../hooks/queries/useUsers';
import * as usePagesModule from '../hooks/queries/usePages';
import * as useCurrentUserModule from '../hooks/queries/useCurrentUser';

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('AdminUsersPage', () => {
  it('lists existing users', () => {
    vi.spyOn(useCurrentUserModule, 'useCurrentUser').mockReturnValue({
      data: { id: 'admin-1', role: 'admin', sectionAccess: {}, canAccessHome: true }
    } as unknown as ReturnType<typeof useCurrentUserModule.useCurrentUser>);
    vi.spyOn(useUsersModule, 'useAdminUsers').mockReturnValue({
      data: [{ id: 'u1', email: 'e@x.com', name: 'Editor 1', role: 'editor', sectionAccess: {}, pageAccess: [] }],
      isLoading: false
    } as unknown as ReturnType<typeof useUsersModule.useAdminUsers>);
    vi.spyOn(useUsersModule, 'useCreateUser').mockReturnValue(
      { mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUsersModule.useCreateUser>
    );
    vi.spyOn(useUsersModule, 'useUpdateUser').mockReturnValue(
      { mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUsersModule.useUpdateUser>
    );
    vi.spyOn(useUsersModule, 'useDeleteUser').mockReturnValue(
      { mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUsersModule.useDeleteUser>
    );
    vi.spyOn(usePagesModule, 'useAdminPagesForSelect').mockReturnValue(
      { data: [] } as unknown as ReturnType<typeof usePagesModule.useAdminPagesForSelect>
    );

    render(wrapper(<AdminUsersPage />));

    expect(screen.getByText('Editor 1')).toBeInTheDocument();
    expect(screen.getByText('e@x.com')).toBeInTheDocument();
  });

  it('blocks submitting the create form without picking a role', () => {
    vi.spyOn(useCurrentUserModule, 'useCurrentUser').mockReturnValue({
      data: { id: 'admin-1', role: 'admin', sectionAccess: {}, canAccessHome: true }
    } as unknown as ReturnType<typeof useCurrentUserModule.useCurrentUser>);
    vi.spyOn(useUsersModule, 'useAdminUsers').mockReturnValue(
      { data: [], isLoading: false } as unknown as ReturnType<typeof useUsersModule.useAdminUsers>
    );
    const createMutate = vi.fn();
    vi.spyOn(useUsersModule, 'useCreateUser').mockReturnValue(
      { mutate: createMutate, isPending: false } as unknown as ReturnType<typeof useUsersModule.useCreateUser>
    );
    vi.spyOn(useUsersModule, 'useUpdateUser').mockReturnValue(
      { mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUsersModule.useUpdateUser>
    );
    vi.spyOn(useUsersModule, 'useDeleteUser').mockReturnValue(
      { mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUsersModule.useDeleteUser>
    );
    vi.spyOn(usePagesModule, 'useAdminPagesForSelect').mockReturnValue(
      { data: [] } as unknown as ReturnType<typeof usePagesModule.useAdminPagesForSelect>
    );

    render(wrapper(<AdminUsersPage />));
    fireEvent.click(screen.getByText('Novo usuário'));
    fireEvent.click(screen.getByText('Salvar'));

    expect(createMutate).not.toHaveBeenCalled();
  });

  it('offers the home page in the page picker when the fetch (includeHome=true) returns it', () => {
    vi.spyOn(useCurrentUserModule, 'useCurrentUser').mockReturnValue({
      data: { id: 'admin-1', role: 'admin', sectionAccess: {}, canAccessHome: true }
    } as unknown as ReturnType<typeof useCurrentUserModule.useCurrentUser>);
    vi.spyOn(useUsersModule, 'useAdminUsers').mockReturnValue(
      { data: [], isLoading: false } as unknown as ReturnType<typeof useUsersModule.useAdminUsers>
    );
    vi.spyOn(useUsersModule, 'useCreateUser').mockReturnValue(
      { mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUsersModule.useCreateUser>
    );
    vi.spyOn(useUsersModule, 'useUpdateUser').mockReturnValue(
      { mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUsersModule.useUpdateUser>
    );
    vi.spyOn(useUsersModule, 'useDeleteUser').mockReturnValue(
      { mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUsersModule.useDeleteUser>
    );
    // Simulates what useAdminPagesForSelect() returns now that it requests
    // ?includeHome=true — the home page comes back with its real title.
    vi.spyOn(usePagesModule, 'useAdminPagesForSelect').mockReturnValue({
      data: [
        { id: 'home-1', title: 'Início', slug: 'home', pageKey: 'home' },
        { id: 'p1', title: 'Sobre', slug: 'sobre', pageKey: null }
      ]
    } as unknown as ReturnType<typeof usePagesModule.useAdminPagesForSelect>);

    render(wrapper(<AdminUsersPage />));
    fireEvent.click(screen.getByText('Novo usuário'));

    expect(screen.getByText('Início')).toBeInTheDocument();
    expect(screen.getByText('Sobre')).toBeInTheDocument();
  });
});
