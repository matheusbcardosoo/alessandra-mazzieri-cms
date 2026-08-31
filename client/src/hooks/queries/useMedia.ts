import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteMedia, fetchMedia, updateMedia, uploadMedia, type MediaUploadPayload } from '@/api/queries';
import type { Media } from '@/types';

export function useMedia(opts?: { search?: string; tag?: string }) {
  return useQuery<Media[]>({
    queryKey: ['admin', 'media', opts?.search ?? '', opts?.tag ?? ''],
    queryFn: () => fetchMedia(opts)
  });
}

export function useUploadMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MediaUploadPayload) => uploadMedia(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'media'] })
  });
}

export function useUpdateMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Media> & { file?: File | null } }) =>
      updateMedia(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'media'] })
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMedia,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'media'] })
  });
}
