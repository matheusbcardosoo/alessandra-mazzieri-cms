import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  type CreateUserPayload,
  type UpdateUserPayload
} from '@/api/queries';
import type { ManagedUser } from '@/types';

export function useAdminUsers() {
  return useQuery<ManagedUser[]>({ queryKey: ['admin', 'users'], queryFn: fetchAdminUsers });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createAdminUser(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] })
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) => updateAdminUser(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] })
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] })
  });
}
