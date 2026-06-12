import { useQuery } from '@tanstack/react-query';
import { type EmailTemplateResponse } from '@email-automation-engine/shared';
import { useTenant } from '../../../contexts/TenantContext';
import api from '../../../lib/api';

export function useEmailTemplates(options?: { enabled?: boolean }) {
  const { currentTenant } = useTenant();

  return useQuery({
    queryKey: ['email-templates', currentTenant?.id],
    queryFn: async () => {
      const res = await api.get<EmailTemplateResponse[]>(
        `/tenants/${currentTenant?.id}/email-templates`,
      );
      return res.data;
    },
    enabled: !!currentTenant && (options?.enabled ?? true),
  });
}
