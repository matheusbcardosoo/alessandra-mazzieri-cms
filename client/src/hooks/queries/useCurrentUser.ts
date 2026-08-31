import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '../../api/queries';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000 // 5 minutos
  });
}
