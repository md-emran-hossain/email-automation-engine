import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type WorkflowStepResponse, STEP_ACTIONS } from '@email-automation-engine/shared';
import { useTenant } from '../../../contexts/TenantContext';
import api from '../../../lib/api';

export function useWorkflowSteps(workflowId: string | undefined) {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['workflow-steps', currentTenant?.id, workflowId],
    queryFn: async () => {
      const res = await api.get<WorkflowStepResponse[]>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}/steps`,
      );
      return res.data;
    },
    enabled: !!currentTenant?.id && !!workflowId,
  });

  const addStep = useMutation({
    mutationFn: async ({
      action,
      parentId,
      branch,
    }: {
      action: string;
      parentId: string | null;
      branch: 'linear' | true | false;
    }) => {
      const steps = query.data || [];
      let existingChild: WorkflowStepResponse | undefined;

      if (parentId === null) {
        existingChild = steps.find(
          (s) =>
            !s.parentWorkflowStepId &&
            !steps.some((p) => p.trueStepId === s.id || p.falseStepId === s.id),
        );
      } else {
        const parentStep = steps.find((s) => s.id === parentId);
        if (parentStep) {
          if (branch === true) existingChild = steps.find((s) => s.id === parentStep.trueStepId);
          else if (branch === false)
            existingChild = steps.find((s) => s.id === parentStep.falseStepId);
          else existingChild = steps.find((s) => s.parentWorkflowStepId === parentId);
        }
      }

      const config = action === STEP_ACTIONS.DELAY ? { amount: 15, unit: 'minutes' } : {};

      const newStepRes = await api.post<WorkflowStepResponse>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}/steps`,
        {
          action,
          config,
          parentWorkflowStepId: branch === 'linear' ? parentId : undefined,
          trueStepId:
            action === STEP_ACTIONS.CONDITIONAL_SPLIT && existingChild
              ? existingChild.id
              : undefined,
        },
      );

      const newStep = newStepRes.data;

      if (parentId && typeof branch === 'boolean') {
        await api.patch(`/tenants/${currentTenant?.id}/workflows/${workflowId}/steps/${parentId}`, {
          [branch ? 'trueStepId' : 'falseStepId']: newStep.id,
        });
      }

      if (existingChild) {
        await api.patch(
          `/tenants/${currentTenant?.id}/workflows/${workflowId}/steps/${existingChild.id}`,
          {
            parentWorkflowStepId: action === STEP_ACTIONS.CONDITIONAL_SPLIT ? null : newStep.id,
          },
        );
      }

      return newStep;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['workflow-steps', currentTenant?.id, workflowId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['workflow', currentTenant?.id, workflowId],
      });
    },
  });

  const updateStep = useMutation({
    mutationFn: async ({
      stepId,
      payload,
    }: {
      stepId: string;
      payload: { action: string; config: Record<string, unknown> };
    }) => {
      const res = await api.patch<WorkflowStepResponse>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}/steps/${stepId}`,
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['workflow-steps', currentTenant?.id, workflowId],
      });
    },
  });

  const deleteStep = useMutation({
    mutationFn: async (stepId: string) => {
      await api.delete(`/tenants/${currentTenant?.id}/workflows/${workflowId}/steps/${stepId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['workflow-steps', currentTenant?.id, workflowId],
      });
    },
  });

  return {
    steps: query.data || [],
    isLoading: query.isLoading,
    addStep,
    updateStep,
    deleteStep,
  };
}
