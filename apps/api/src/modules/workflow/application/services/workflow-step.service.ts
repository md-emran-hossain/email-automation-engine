import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  type CreateWorkflowStepDto,
  type UpdateWorkflowStepDto,
  type WorkflowStepResponse,
  type ReorderWorkflowStepDto,
} from '@email-automation-engine/shared';
import { WORKFLOW_STEP_REPOSITORY } from '../../constants/tokens';
import { type WorkflowStepRepository } from '../../domain/repositories/workflow-step.repository';
import { WorkflowStep } from '../../domain/aggregates/workflow-step.aggregate';
import { WorkflowService } from './workflow.service';
import { WorkflowTreeOperator } from '../../domain/services/workflow-tree.operator';

@Injectable()
export class WorkflowStepService {
  constructor(
    @Inject(WORKFLOW_STEP_REPOSITORY)
    private readonly stepRepo: WorkflowStepRepository,
    private readonly workflowService: WorkflowService,
  ) {}

  private async getInactiveWorkflowSteps(tenantId: string, workflowId: string) {
    await this.workflowService.verifyWorkflowInactive(tenantId, workflowId);
    return this.stepRepo.findByWorkflowId(workflowId);
  }

  async getSteps(tenantId: string, workflowId: string): Promise<WorkflowStepResponse[]> {
    await this.workflowService.findById(tenantId, workflowId);
    const steps = await this.stepRepo.findByWorkflowId(workflowId);
    return steps.map((s) => this.mapStepToResponse(s));
  }

  async findStep(
    tenantId: string,
    workflowId: string,
    stepId: string,
  ): Promise<WorkflowStepResponse> {
    await this.workflowService.getWorkflowOrThrow(tenantId, workflowId);
    const steps = await this.stepRepo.findByWorkflowId(workflowId);
    const operator = new WorkflowTreeOperator(steps);
    return this.mapStepToResponse(operator.getStepOrThrow(stepId));
  }

  async addStep(
    tenantId: string,
    workflowId: string,
    dto: CreateWorkflowStepDto,
  ): Promise<WorkflowStepResponse> {
    const steps = await this.getInactiveWorkflowSteps(tenantId, workflowId);
    this.validateStepData(dto, steps);

    const step = new WorkflowStep();
    Object.assign(step, {
      tenantId,
      workflowId,
      action: dto.action,
      config: dto.config,
      position: dto.position ?? 0,
      parentWorkflowStepId: dto.parentWorkflowStepId ?? null,
      trueStepId: dto.trueStepId ?? null,
      falseStepId: dto.falseStepId ?? null,
    });

    const saved = await this.stepRepo.save(step);
    return this.mapStepToResponse(saved);
  }

  async updateStep(
    tenantId: string,
    workflowId: string,
    stepId: string,
    dto: UpdateWorkflowStepDto,
  ): Promise<WorkflowStepResponse> {
    const steps = await this.getInactiveWorkflowSteps(tenantId, workflowId);
    const step = new WorkflowTreeOperator(steps).getStepOrThrow(stepId);

    this.validateStepData({ ...step, ...dto }, steps);

    if (dto.action !== undefined) step.action = dto.action;
    if (dto.config !== undefined) step.config = dto.config;
    if (dto.parentWorkflowStepId !== undefined)
      step.parentWorkflowStepId = dto.parentWorkflowStepId ?? null;
    if (dto.trueStepId !== undefined) step.trueStepId = dto.trueStepId ?? null;
    if (dto.falseStepId !== undefined) step.falseStepId = dto.falseStepId ?? null;

    const saved = await this.stepRepo.save(step);
    return this.mapStepToResponse(saved);
  }

  async reorderStep(
    tenantId: string,
    workflowId: string,
    stepId: string,
    dto: ReorderWorkflowStepDto,
  ): Promise<WorkflowStepResponse> {
    const steps = await this.getInactiveWorkflowSteps(tenantId, workflowId);
    const operator = new WorkflowTreeOperator(steps);
    const stepToMove = operator.getStepOrThrow(stepId);

    if (stepToMove.trueStepId && stepToMove.falseStepId) {
      throw new BadRequestException(
        'Cannot move a split step that has both true and false branches populated',
      );
    }

    const modifiedNodes = new Set<WorkflowStep>();
    for (const node of operator.unlinkStep(stepId)) modifiedNodes.add(node);
    for (const node of operator.spliceStep(stepToMove, dto.parentId, dto.branch))
      modifiedNodes.add(node);

    for (const node of modifiedNodes) {
      await this.stepRepo.save(node);
    }

    return this.mapStepToResponse(stepToMove);
  }

  async deleteStep(tenantId: string, workflowId: string, stepId: string): Promise<void> {
    const steps = await this.getInactiveWorkflowSteps(tenantId, workflowId);
    const operator = new WorkflowTreeOperator(steps);

    // Ensure the step exists before attempting deletion
    operator.getStepOrThrow(stepId);

    for (const node of operator.unlinkStep(stepId)) {
      await this.stepRepo.save(node);
    }

    await this.stepRepo.delete(stepId);
  }

  private validateStepData(
    data: {
      action?: string;
      config?: Record<string, unknown> | null;
      parentWorkflowStepId?: string | null;
      trueStepId?: string | null;
      falseStepId?: string | null;
    },
    steps: WorkflowStep[],
  ) {
    const ensureExists = (id: string | null | undefined, errorMsg: string) => {
      if (id && !steps.some((s) => s.id === id)) throw new BadRequestException(errorMsg);
    };

    ensureExists(data.parentWorkflowStepId, 'Parent step must belong to the same workflow');
    ensureExists(data.trueStepId, 'True step must belong to the same workflow');
    ensureExists(data.falseStepId, 'False step must belong to the same workflow');
  }

  private mapStepToResponse(step: WorkflowStep): WorkflowStepResponse {
    return {
      id: step.id,
      tenantId: step.tenantId,
      workflowId: step.workflowId,
      parentWorkflowStepId: step.parentWorkflowStepId ?? null,
      action: step.action,
      config: step.config ?? undefined,
      position: step.position,
      trueStepId: step.trueStepId ?? null,
      falseStepId: step.falseStepId ?? null,
      createdAt: step.createdAt.toISOString(),
      updatedAt: step.updatedAt.toISOString(),
    };
  }
}
