import type { WorkflowStepCondition } from '../aggregates/workflow-step-condition.aggregate';

export interface IWorkflowStepConditionRepository {
  findByStepId(
    tenantId: string,
    workflowId: string,
    stepId: string,
  ): Promise<WorkflowStepCondition[]>;
  replaceForStep(
    tenantId: string,
    workflowId: string,
    stepId: string,
    conditions: Omit<WorkflowStepCondition, 'id' | 'createdAt' | 'updatedAt' | 'generateId'>[],
  ): Promise<WorkflowStepCondition[]>;
}
