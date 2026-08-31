import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createNavbarItem, deleteNavbarItem, fetchAdminNavbar, reorderNavbarItems, updateNavbarItem } from '@/api/queries';
import type { NavbarItem } from '@/types';

export function useAdminNavbar() {
  return useQuery<NavbarItem[]>({ queryKey: ['admin', 'navbar'], queryFn: fetchAdminNavbar });
}

function useRefreshNav() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['admin', 'navbar'] });
    qc.invalidateQueries({ queryKey: ['navbar'] });
  };
}

export function useCreateNavbarItem() {
  const refreshNav = useRefreshNav();
  return useMutation({
    mutationFn: createNavbarItem,
    onSuccess: refreshNav
  });
}

export function useUpdateNavbarItem() {
  const refreshNav = useRefreshNav();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<NavbarItem> }) => updateNavbarItem(id, payload),
    onSuccess: refreshNav
  });
}

export function useDeleteNavbarItem() {
  const refreshNav = useRefreshNav();
  return useMutation({
    mutationFn: deleteNavbarItem,
    onSuccess: refreshNav
  });
}

export function useReorderNavbarItems() {
  const refreshNav = useRefreshNav();
  return useMutation({
    mutationFn: ({ context, items }: { context: 'navbar' | 'footer'; items: { id: string; parentId?: string | null; order: number }[] }) =>
      reorderNavbarItems(context, items),
    onSuccess: refreshNav
  });
}
