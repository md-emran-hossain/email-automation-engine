import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type WorkflowTriggerResponse,
  type UpdateWorkflowTriggerDto,
} from '@email-automation-engine/shared';
import { useTenant } from '../../../contexts/TenantContext';
import api from '../../../lib/api';

export function useWorkflowTriggers(workflowId: string | undefined) {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['workflow-triggers', currentTenant?.id, workflowId],
    queryFn: async () => {
      const res = await api.get<WorkflowTriggerResponse[]>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}/triggers`,
      );
      return res.data;
    },
    enabled: !!currentTenant?.id && !!workflowId,
  });

  const addTrigger = useMutation({
    mutationFn: async (event: string) => {
      const res = await api.post<WorkflowTriggerResponse>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}/triggers`,
        { event, filters: {} },
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['workflow-triggers', currentTenant?.id, workflowId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['workflow', currentTenant?.id, workflowId],
      });
    },
  });

  const updateTrigger = useMutation({
    mutationFn: async ({
      triggerId,
      payload,
    }: {
      triggerId: string;
      payload: UpdateWorkflowTriggerDto;
    }) => {
      const res = await api.patch<WorkflowTriggerResponse>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}/triggers/${triggerId}`,
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['workflow-triggers', currentTenant?.id, workflowId],
      });
    },
  });

  const deleteTrigger = useMutation({
    mutationFn: async (triggerId: string) => {
      await api.delete(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}/triggers/${triggerId}`,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['workflow-triggers', currentTenant?.id, workflowId],
      });
    },
  });

  return {
    triggers: query.data || [],
    isLoading: query.isLoading,
    addTrigger,
    updateTrigger,
    deleteTrigger,
  };
}
