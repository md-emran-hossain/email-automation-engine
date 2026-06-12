import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type WorkflowResponse } from '@email-automation-engine/shared';
import { useTenant } from '../../../contexts/TenantContext';
import api from '../../../lib/api';

export function useWorkflow(workflowId: string | undefined) {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['workflow', currentTenant?.id, workflowId],
    queryFn: async () => {
      const res = await api.get<WorkflowResponse>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}`,
      );
      return res.data;
    },
    enabled: !!currentTenant?.id && !!workflowId,
  });

  const toggleActive = useMutation({
    mutationFn: async () => {
      const endpoint = query.data?.isActive ? 'deactivate' : 'activate';
      const res = await api.patch<WorkflowResponse>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}/${endpoint}`,
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['workflow', currentTenant?.id, workflowId],
      });
    },
  });

  return {
    workflow: query.data,
    isLoading: query.isLoading,
    toggleActive,
  };
}
