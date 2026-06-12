import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  type CreateWorkflowStepDto,
  type UpdateWorkflowStepDto,
  type WorkflowStepResponse,
  type ReorderWorkflowStepDto,
  STEP_ACTIONS,
} from '@email-automation-engine/shared';
import { WORKFLOW_STEP_REPOSITORY } from '../../constants/tokens';
import { type WorkflowStepRepository } from '../../domain/repositories/workflow-step.repository';
import { WorkflowStep } from '../../domain/aggregates/workflow-step.aggregate';
import { WorkflowService } from './workflow.service';

@Injectable()
export class WorkflowStepService {
  constructor(
    @Inject(WORKFLOW_STEP_REPOSITORY)
    private readonly stepRepo: WorkflowStepRepository,
    private readonly workflowService: WorkflowService,
  ) {}

  private validateDelayConfig(config: Record<string, unknown> | undefined) {
    if (!config) return;
    const { unit, amount } = config as {
      unit?: string;
      amount?: string | number;
    };
    if (unit === 'minutes') {
      const val = Number(amount);
      if (isNaN(val) || val < 15) {
        throw new BadRequestException('Minimum delay for minutes is 15');
      }
      if (val % 15 !== 0) {
        throw new BadRequestException('Delay in minutes must be a multiple of 15');
      }
    } else if (unit) {
      const val = Number(amount);
      if (isNaN(val) || val < 1) {
        throw new BadRequestException('Minimum delay is 1');
      }
    }
  }

  async getSteps(tenantId: string, workflowId: string): Promise<WorkflowStepResponse[]> {
    await this.workflowService.findById(tenantId, workflowId);
    const steps = await this.stepRepo.findByWorkflowId(workflowId);
    return steps.map((s) => this.mapStepToResponse(s));
  }

  async addStep(
    tenantId: string,
    workflowId: string,
    dto: CreateWorkflowStepDto,
  ): Promise<WorkflowStepResponse> {
    await this.workflowService.verifyWorkflowInactive(tenantId, workflowId);

    if (dto.parentWorkflowStepId || dto.trueStepId || dto.falseStepId) {
      const steps = await this.stepRepo.findByWorkflowId(workflowId);
      if (dto.parentWorkflowStepId && !steps.some((s) => s.id === dto.parentWorkflowStepId)) {
        throw new BadRequestException('Parent step must belong to the same workflow');
      }
      if (dto.trueStepId && !steps.some((s) => s.id === dto.trueStepId)) {
        throw new BadRequestException('True step must belong to the same workflow');
      }
      if (dto.falseStepId && !steps.some((s) => s.id === dto.falseStepId)) {
        throw new BadRequestException('False step must belong to the same workflow');
      }
    }

    if (dto.action === STEP_ACTIONS.DELAY) {
      this.validateDelayConfig(dto.config);
    }

    const step = new WorkflowStep();
    step.tenantId = tenantId;
    step.workflowId = workflowId;
    step.action = dto.action;
    step.config = dto.config;
    step.position = dto.position ?? 0;
    step.parentWorkflowStepId = dto.parentWorkflowStepId ?? null;
    step.trueStepId = dto.trueStepId ?? null;
    step.falseStepId = dto.falseStepId ?? null;
    const saved = await this.stepRepo.save(step);
    return this.mapStepToResponse(saved);
  }

  async updateStep(
    tenantId: string,
    workflowId: string,
    stepId: string,
    dto: UpdateWorkflowStepDto,
  ): Promise<WorkflowStepResponse> {
    await this.workflowService.verifyWorkflowInactive(tenantId, workflowId);

    const steps = await this.stepRepo.findByWorkflowId(workflowId);
    const step = steps.find((s) => s.id === stepId);
    if (!step) {
      throw new NotFoundException('Step not found');
    }

    const actionToSave = dto.action !== undefined ? dto.action : step.action;
    const configToSave = dto.config !== undefined ? dto.config : step.config;

    if (actionToSave === STEP_ACTIONS.DELAY && dto.config !== undefined) {
      this.validateDelayConfig(configToSave);
    }

    if (dto.action !== undefined) step.action = dto.action;
    if (dto.config !== undefined) step.config = dto.config;
    if (dto.parentWorkflowStepId !== undefined) {
      if (dto.parentWorkflowStepId && !steps.some((s) => s.id === dto.parentWorkflowStepId)) {
        throw new BadRequestException('Parent step must belong to the same workflow');
      }
      step.parentWorkflowStepId = dto.parentWorkflowStepId ?? null;
    }
    if (dto.trueStepId !== undefined) {
      if (dto.trueStepId && !steps.some((s) => s.id === dto.trueStepId)) {
        throw new BadRequestException('True step must belong to the same workflow');
      }
      step.trueStepId = dto.trueStepId ?? null;
    }
    if (dto.falseStepId !== undefined) {
      if (dto.falseStepId && !steps.some((s) => s.id === dto.falseStepId)) {
        throw new BadRequestException('False step must belong to the same workflow');
      }
      step.falseStepId = dto.falseStepId ?? null;
    }

    const saved = await this.stepRepo.save(step);
    return this.mapStepToResponse(saved);
  }

  async reorderStep(
    tenantId: string,
    workflowId: string,
    stepId: string,
    dto: ReorderWorkflowStepDto,
  ): Promise<WorkflowStepResponse> {
    await this.workflowService.verifyWorkflowInactive(tenantId, workflowId);

    const steps = await this.stepRepo.findByWorkflowId(workflowId);
    const stepToMove = steps.find((s) => s.id === stepId);
    if (!stepToMove) {
      throw new NotFoundException('Step not found');
    }

    if (stepToMove.trueStepId && stepToMove.falseStepId) {
      throw new BadRequestException(
        'Cannot move a split step that has both true and false branches populated',
      );
    }

    // 1. Healing the old position
    const linearChild = steps.find((s) => s.parentWorkflowStepId === stepId);
    const replacementId =
      linearChild?.id || stepToMove.trueStepId || stepToMove.falseStepId || null;

    if (linearChild) {
      linearChild.parentWorkflowStepId = stepToMove.parentWorkflowStepId;
      await this.stepRepo.save(linearChild);
    } else if (replacementId) {
      const promotedChild = steps.find((s) => s.id === replacementId);
      if (promotedChild) {
        promotedChild.parentWorkflowStepId = stepToMove.parentWorkflowStepId;
        await this.stepRepo.save(promotedChild);
      }
    }

    const conditionalParents = steps.filter(
      (s) => s.trueStepId === stepId || s.falseStepId === stepId,
    );
    for (const parent of conditionalParents) {
      if (parent.trueStepId === stepId) parent.trueStepId = replacementId;
      if (parent.falseStepId === stepId) parent.falseStepId = replacementId;
      await this.stepRepo.save(parent);
    }

    // 2. Splicing into new position
    let existingChild: WorkflowStep | undefined;
    if (dto.parentId === null) {
      existingChild = steps.find(
        (s) =>
          s.id !== stepId &&
          !s.parentWorkflowStepId &&
          !steps.some((p) => p.trueStepId === s.id || p.falseStepId === s.id),
      );
      stepToMove.parentWorkflowStepId = null;
    } else {
      const parentStep = steps.find((s) => s.id === dto.parentId);
      if (!parentStep) throw new NotFoundException('Target parent not found');

      if (dto.branch === true) {
        existingChild = steps.find((s) => s.id === parentStep.trueStepId && s.id !== stepId);
        parentStep.trueStepId = stepToMove.id;
        stepToMove.parentWorkflowStepId = null; // branch children don't have linear parent
      } else if (dto.branch === false) {
        existingChild = steps.find((s) => s.id === parentStep.falseStepId && s.id !== stepId);
        parentStep.falseStepId = stepToMove.id;
        stepToMove.parentWorkflowStepId = null; // branch children don't have linear parent
      } else {
        existingChild = steps.find(
          (s) => s.parentWorkflowStepId === dto.parentId && s.id !== stepId,
        );
        stepToMove.parentWorkflowStepId = dto.parentId;
      }
      await this.stepRepo.save(parentStep);
    }

    if (existingChild) {
      // Always attach existing child to true branch if split, else linear
      if (stepToMove.action === STEP_ACTIONS.CONDITIONAL_SPLIT) {
        stepToMove.trueStepId = existingChild.id;
        existingChild.parentWorkflowStepId = null;
      } else {
        existingChild.parentWorkflowStepId = stepToMove.id;
      }
      await this.stepRepo.save(existingChild);
    }

    // Reset old children pointers to avoid duplicates if we moved it
    if (stepToMove.action === STEP_ACTIONS.CONDITIONAL_SPLIT) {
      if (stepToMove.trueStepId && stepToMove.trueStepId !== existingChild?.id)
        stepToMove.trueStepId = null;
      if (stepToMove.falseStepId && stepToMove.falseStepId !== existingChild?.id)
        stepToMove.falseStepId = null;
    }

    const saved = await this.stepRepo.save(stepToMove);
    return this.mapStepToResponse(saved);
  }

  async deleteStep(tenantId: string, workflowId: string, stepId: string): Promise<void> {
    await this.workflowService.verifyWorkflowInactive(tenantId, workflowId);

    const steps = await this.stepRepo.findByWorkflowId(workflowId);
    const stepToDelete = steps.find((s) => s.id === stepId);
    if (!stepToDelete) {
      throw new NotFoundException('Step not found');
    }

    // 1. Find linear child
    const linearChild = steps.find((s) => s.parentWorkflowStepId === stepId);

    // 2. Determine replacement ID
    const replacementId =
      linearChild?.id || stepToDelete.trueStepId || stepToDelete.falseStepId || null;

    // 3. Update linear child's parent reference
    if (linearChild) {
      linearChild.parentWorkflowStepId = stepToDelete.parentWorkflowStepId;
      await this.stepRepo.save(linearChild);
    } else {
      // If no linear child, but we have a conditional child being promoted,
      // update its parentWorkflowStepId to the deleted step's linear parent
      if (replacementId) {
        const promotedChild = steps.find((s) => s.id === replacementId);
        if (promotedChild) {
          promotedChild.parentWorkflowStepId = stepToDelete.parentWorkflowStepId;
          await this.stepRepo.save(promotedChild);
        }
      }
    }

    // 4. Update conditional parents
    const conditionalParents = steps.filter(
      (s) => s.trueStepId === stepId || s.falseStepId === stepId,
    );

    for (const parent of conditionalParents) {
      if (parent.trueStepId === stepId) {
        parent.trueStepId = replacementId;
      }
      if (parent.falseStepId === stepId) {
        parent.falseStepId = replacementId;
      }
      await this.stepRepo.save(parent);
    }

    // 5. Delete the step
    await this.stepRepo.delete(stepId);
  }

  async findStep(
    tenantId: string,
    workflowId: string,
    stepId: string,
  ): Promise<WorkflowStepResponse> {
    await this.workflowService.getWorkflowOrThrow(tenantId, workflowId);
    const steps = await this.stepRepo.findByWorkflowId(workflowId);
    const step = steps.find((s) => s.id === stepId);
    if (!step) {
      throw new NotFoundException('Step not found');
    }
    return this.mapStepToResponse(step);
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
