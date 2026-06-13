import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type WorkflowExitConditionResponse,
  type CreateWorkflowExitConditionDto,
} from '@email-automation-engine/shared';
import { useTenant } from '../../../contexts/TenantContext';
import api from '../../../lib/api';

export function useWorkflowExitConditions(workflowId: string | undefined) {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const queryKey = ['workflow-exit-conditions', currentTenant?.id, workflowId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get<WorkflowExitConditionResponse[]>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}/exit-conditions`,
      );
      return res.data;
    },
    enabled: !!currentTenant?.id && !!workflowId,
  });

  const replaceConditions = useMutation({
    mutationFn: async (conditions: CreateWorkflowExitConditionDto[]) => {
      const res = await api.put<WorkflowExitConditionResponse[]>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}/exit-conditions`,
        conditions,
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    exitConditions: query.data || [],
    isLoading: query.isLoading,
    replaceConditions,
  };
}
