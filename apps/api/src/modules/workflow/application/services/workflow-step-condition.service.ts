import { Injectable, Inject } from '@nestjs/common';
import type { IWorkflowStepConditionRepository } from '../../domain/repositories/workflow-step-condition.repository';
import { WORKFLOW_STEP_CONDITION_REPOSITORY } from '../../constants/tokens';
import { WorkflowService } from './workflow.service';
import type {
  WorkflowStepConditionResponse,
  CreateWorkflowStepConditionDto,
} from '@email-automation-engine/shared';
import type { WorkflowStepCondition } from '../../domain/aggregates/workflow-step-condition.aggregate';

@Injectable()
export class WorkflowStepConditionService {
  constructor(
    @Inject(WORKFLOW_STEP_CONDITION_REPOSITORY)
    private readonly conditionRepo: IWorkflowStepConditionRepository,
    private readonly workflowService: WorkflowService,
  ) {}

  async getConditions(
    tenantId: string,
    workflowId: string,
    stepId: string,
  ): Promise<WorkflowStepConditionResponse[]> {
    const conditions = await this.conditionRepo.findByStepId(tenantId, workflowId, stepId);
    return conditions.map((c) => this.mapToResponse(c));
  }

  async replaceConditions(
    tenantId: string,
    workflowId: string,
    stepId: string,
    dtos: CreateWorkflowStepConditionDto[],
  ): Promise<WorkflowStepConditionResponse[]> {
    await this.workflowService.verifyWorkflowInactive(tenantId, workflowId);

    const conditionsData = dtos.map((dto) => ({
      tenantId,
      workflowId,
      workflowStepId: stepId,
      type: dto.type,
      resource: dto.resource,
      operator: dto.operator,
      value: dto.value || null,
      logicalOperator: dto.logicalOperator,
    }));

    const saved = await this.conditionRepo.replaceForStep(
      tenantId,
      workflowId,
      stepId,
      conditionsData,
    );
    return saved.map((c) => this.mapToResponse(c));
  }

  private mapToResponse(condition: WorkflowStepCondition): WorkflowStepConditionResponse {
    return {
      id: condition.id,
      tenantId: condition.tenantId,
      workflowStepId: condition.workflowStepId,
      logicalOperator: condition.logicalOperator,
      type: condition.type,
      resource: condition.resource,
      operator: condition.operator,
      value: condition.value,
      createdAt: condition.createdAt.toISOString(),
      updatedAt: condition.updatedAt.toISOString(),
    };
  }
}
