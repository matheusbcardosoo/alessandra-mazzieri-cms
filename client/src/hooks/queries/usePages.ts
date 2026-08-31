import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPage,
  deletePage,
  fetchAdminPages,
  fetchPageMissingMedia,
  fetchPageVersions,
  publishPage,
  revertPageVersion,
  unpublishPage,
  updatePage
} from '@/api/queries';
import type { Page } from '@/types';

export function usePages() {
  return useQuery<Page[]>({ queryKey: ['admin', 'pages'], queryFn: () => fetchAdminPages(), retry: 1 });
}

// Usado pelo picker de páginas do admin de Usuários (conceder acesso) — ao
// contrário de usePages(), inclui a home (mas nunca o blog, que não é
// concedido por página) para que "Página inicial" possa ser selecionada.
export function useAdminPagesForSelect() {
  return useQuery<Page[]>({ queryKey: ['admin', 'pages', 'select'], queryFn: () => fetchAdminPages(true) });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Page>) => createPage(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
    }
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Page> }) => updatePage(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      qc.invalidateQueries({ queryKey: ['admin', 'pages', data.page.id, 'missing-media'] });
    }
  });
}

export function usePublishPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publishPage,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      qc.invalidateQueries({ queryKey: ['page', data.slug] });
      qc.invalidateQueries({ queryKey: ['admin', 'pages', data.id, 'missing-media'] });
    }
  });
}

export function useUnpublishPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: unpublishPage,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      qc.invalidateQueries({ queryKey: ['page', data.slug] });
    }
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePage,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pages'] })
  });
}

export function usePageVersions(pageId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'pages', pageId, 'versions'],
    queryFn: () => fetchPageVersions(pageId as string),
    enabled: enabled && !!pageId
  });
}

export function useRevertPageVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, versionId }: { pageId: string; versionId: string }) => revertPageVersion(pageId, versionId),
    onSuccess: (data, { pageId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      qc.invalidateQueries({ queryKey: ['admin', 'pages', pageId, 'versions'] });
      qc.invalidateQueries({ queryKey: ['page', data.slug] });
      qc.invalidateQueries({ queryKey: ['admin', 'pages', pageId, 'missing-media'] });
    }
  });
}

export function usePageMissingMedia(pageId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'pages', pageId, 'missing-media'],
    queryFn: () => fetchPageMissingMedia(pageId as string),
    enabled: enabled && !!pageId
  });
}
