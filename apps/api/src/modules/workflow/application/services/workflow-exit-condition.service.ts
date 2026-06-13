import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  type CreateWorkflowExitConditionDto,
  type UpdateWorkflowExitConditionDto,
  type WorkflowExitConditionResponse,
} from '@email-automation-engine/shared';
import { WORKFLOW_EXIT_CONDITION_REPOSITORY } from '../../constants/tokens';
import { type WorkflowExitConditionRepository } from '../../domain/repositories/workflow-exit-condition.repository';
import { WorkflowExitCondition } from '../../domain/aggregates/workflow-exit-condition.aggregate';
import { WorkflowService } from './workflow.service';

@Injectable()
export class WorkflowExitConditionService {
  constructor(
    @Inject(WORKFLOW_EXIT_CONDITION_REPOSITORY)
    private readonly exitConditionRepo: WorkflowExitConditionRepository,
    private readonly workflowService: WorkflowService,
  ) {}

  async addExitCondition(
    tenantId: string,
    workflowId: string,
    dto: CreateWorkflowExitConditionDto,
  ): Promise<WorkflowExitConditionResponse> {
    await this.workflowService.verifyWorkflowInactive(tenantId, workflowId);

    const condition = new WorkflowExitCondition();
    condition.tenantId = tenantId;
    condition.workflowId = workflowId;
    condition.logicalOperator = dto.logicalOperator;
    condition.type = dto.type;
    condition.resource = dto.resource;
    condition.operator = dto.operator;
    condition.value = dto.value ?? null;
    const saved = await this.exitConditionRepo.save(condition);
    return this.mapExitConditionToResponse(saved);
  }

  async updateExitCondition(
    tenantId: string,
    workflowId: string,
    conditionId: string,
    dto: UpdateWorkflowExitConditionDto,
  ): Promise<WorkflowExitConditionResponse> {
    await this.workflowService.verifyWorkflowInactive(tenantId, workflowId);

    const conditions = await this.exitConditionRepo.findByWorkflowId(workflowId);
    const condition = conditions.find((c) => c.id === conditionId);
    if (!condition) {
      throw new NotFoundException('Exit condition not found');
    }

    if (dto.logicalOperator !== undefined) condition.logicalOperator = dto.logicalOperator;
    if (dto.type !== undefined) condition.type = dto.type;
    if (dto.resource !== undefined) condition.resource = dto.resource;
    if (dto.operator !== undefined) condition.operator = dto.operator;
    if (dto.value !== undefined) condition.value = dto.value ?? null;

    const saved = await this.exitConditionRepo.save(condition);
    return this.mapExitConditionToResponse(saved);
  }

  async deleteExitCondition(
    tenantId: string,
    workflowId: string,
    conditionId: string,
  ): Promise<void> {
    await this.workflowService.verifyWorkflowInactive(tenantId, workflowId);

    const conditions = await this.exitConditionRepo.findByWorkflowId(workflowId);
    if (!conditions.some((c) => c.id === conditionId)) {
      throw new NotFoundException('Exit condition not found');
    }

    await this.exitConditionRepo.delete(conditionId);
  }

  async getExitConditions(
    tenantId: string,
    workflowId: string,
  ): Promise<WorkflowExitConditionResponse[]> {
    await this.workflowService.getWorkflowOrThrow(tenantId, workflowId);
    const conditions = await this.exitConditionRepo.findByWorkflowId(workflowId);
    return conditions.map((c) => this.mapExitConditionToResponse(c));
  }

  async replaceExitConditions(
    tenantId: string,
    workflowId: string,
    dtos: CreateWorkflowExitConditionDto[],
  ): Promise<WorkflowExitConditionResponse[]> {
    await this.workflowService.verifyWorkflowInactive(tenantId, workflowId);
    await this.exitConditionRepo.deleteByWorkflowId(workflowId);

    const conditionsToSave = dtos.map((dto) => {
      const condition = new WorkflowExitCondition();
      condition.tenantId = tenantId;
      condition.workflowId = workflowId;
      condition.logicalOperator = dto.logicalOperator;
      condition.type = dto.type;
      condition.resource = dto.resource;
      condition.operator = dto.operator;
      condition.value = dto.value ?? null;
      return condition;
    });

    let saved: WorkflowExitCondition[] = [];
    if (conditionsToSave.length > 0) {
      saved = await this.exitConditionRepo.save(conditionsToSave);
    }

    return saved.map((c) => this.mapExitConditionToResponse(c));
  }

  private mapExitConditionToResponse(
    condition: WorkflowExitCondition,
  ): WorkflowExitConditionResponse {
    return {
      id: condition.id,
      tenantId: condition.tenantId,
      workflowId: condition.workflowId,
      logicalOperator: condition.logicalOperator,
      type: condition.type,
      resource: condition.resource ?? undefined,
      operator: condition.operator,
      value: condition.value ?? undefined,
      createdAt: condition.createdAt.toISOString(),
      updatedAt: condition.updatedAt.toISOString(),
    };
  }
}
