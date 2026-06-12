import { useQuery } from '@tanstack/react-query';
import { type TagResponse } from '@email-automation-engine/shared';
import { useTenant } from '../../../contexts/TenantContext';
import api from '../../../lib/api';

export function useTags(options?: { enabled?: boolean }) {
  const { currentTenant } = useTenant();

  return useQuery({
    queryKey: ['tags', currentTenant?.id],
    queryFn: async () => {
      const res = await api.get<TagResponse[]>(`/tenants/${currentTenant?.id}/tags`);
      return res.data;
    },
    enabled: !!currentTenant && (options?.enabled ?? true),
  });
}
