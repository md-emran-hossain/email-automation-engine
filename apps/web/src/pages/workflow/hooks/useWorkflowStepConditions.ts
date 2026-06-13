import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type WorkflowStepConditionResponse,
  type CreateWorkflowStepConditionDto,
} from '@email-automation-engine/shared';
import { useTenant } from '../../../contexts/TenantContext';
import api from '../../../lib/api';

export function useWorkflowStepConditions(workflowId: string, stepId: string) {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const queryKey = ['workflow-step-conditions', currentTenant?.id, workflowId, stepId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get<WorkflowStepConditionResponse[]>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}/steps/${stepId}/conditions`,
      );
      return res.data;
    },
    enabled: !!currentTenant?.id && !!workflowId && !!stepId,
  });

  const replaceConditions = useMutation({
    mutationFn: async (conditions: CreateWorkflowStepConditionDto[]) => {
      const res = await api.put<WorkflowStepConditionResponse[]>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}/steps/${stepId}/conditions`,
        conditions,
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    conditions: query.data || [],
    isLoading: query.isLoading,
    replaceConditions,
  };
}
