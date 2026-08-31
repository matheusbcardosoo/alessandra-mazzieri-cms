import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAdminUsers } from './useUsers';
import * as queries from '../../api/queries';

vi.spyOn(queries, 'fetchAdminUsers').mockResolvedValue([
  { id: 'u1', email: 'e@x.com', name: 'E', role: 'editor', sectionAccess: { blog: true, menu: false, media: false, forms: false, settings: false }, pageAccess: [] }
]);

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useAdminUsers', () => {
  it('fetches the managed user list', async () => {
    const { result } = renderHook(() => useAdminUsers(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].role).toBe('editor');
  });
});
