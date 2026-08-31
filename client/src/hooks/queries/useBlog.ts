import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminBlog, updateAdminBlog } from '@/api/queries';
import type { BlogAdminConfig, BlogSection } from '@/types';

export function useAdminBlog() {
  return useQuery<BlogAdminConfig>({ queryKey: ['admin', 'blog'], queryFn: fetchAdminBlog });
}

export function useUpdateBlog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: string;
      payload: { title?: string; description?: string | null; sections?: BlogSection[] };
    }) => updateAdminBlog(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(['admin', 'blog'], data);
      qc.invalidateQueries({ queryKey: ['blog-home'] });
    }
  });
}
