import { useQuery } from '@tanstack/react-query';
import { fetchSetupStatus } from '@/api/queries';

export function useSetupStatus() {
  return useQuery({
    queryKey: ['setupStatus'],
    queryFn: fetchSetupStatus
  });
}
