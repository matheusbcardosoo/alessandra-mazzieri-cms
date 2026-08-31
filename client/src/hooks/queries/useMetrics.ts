import { useQuery } from '@tanstack/react-query';
import { fetchDashboardMetrics } from '../../api/queries';

export function useMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: fetchDashboardMetrics,
    staleTime: 2 * 60 * 1000 // 2 minutos
  });
}
