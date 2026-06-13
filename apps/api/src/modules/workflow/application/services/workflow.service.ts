import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { lookup } from 'node:dns/promises';
import {
  CACHE_SERVICE,
  type ICacheService,
} from '../../../../infrastructure/cache/cache.interface';
import {
  type CreateWorkflowDto,
  type UpdateWorkflowDto,
  type WorkflowResponse,
  type WorkflowTriggerResponse,
  type WorkflowStepResponse,
  type WorkflowExitConditionResponse,
  STEP_ACTIONS,
} from '@email-automation-engine/shared';
import {
  WORKFLOW_REPOSITORY,
  WORKFLOW_TRIGGER_REPOSITORY,
  WORKFLOW_STEP_REPOSITORY,
  WORKFLOW_EXIT_CONDITION_REPOSITORY,
} from '../../constants/tokens';
import { type WorkflowRepository } from '../../domain/repositories/workflow.repository';
import { type WorkflowTriggerRepository } from '../../domain/repositories/workflow-trigger.repository';
import { type WorkflowStepRepository } from '../../domain/repositories/workflow-step.repository';
import { type WorkflowExitConditionRepository } from '../../domain/repositories/workflow-exit-condition.repository';
import { Workflow } from '../../domain/aggregates/workflow.aggregate';
import { WorkflowTrigger } from '../../domain/aggregates/workflow-trigger.aggregate';
import { WorkflowStep } from '../../domain/aggregates/workflow-step.aggregate';
import { WorkflowExitCondition } from '../../domain/aggregates/workflow-exit-condition.aggregate';
import { TriggerCacheService } from '../../../automation-event/application/services/trigger-cache.service';

@Injectable()
export class WorkflowService {
  constructor(
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(WORKFLOW_TRIGGER_REPOSITORY)
    private readonly triggerRepo: WorkflowTriggerRepository,
    @Inject(WORKFLOW_STEP_REPOSITORY)
    private readonly stepRepo: WorkflowStepRepository,
    @Inject(WORKFLOW_EXIT_CONDITION_REPOSITORY)
    private readonly exitConditionRepo: WorkflowExitConditionRepository,
    private readonly dataSource: DataSource,
    @Optional()
    @Inject(CACHE_SERVICE)
    private readonly cacheService?: ICacheService,
  ) {}

  async create(tenantId: string, dto: CreateWorkflowDto): Promise<WorkflowResponse> {
    const workflow = new Workflow();
    workflow.tenantId = tenantId;
    workflow.name = dto.name;
    workflow.description = dto.description;

    const saved = await this.workflowRepo.save(workflow);
    return this.mapWorkflowToResponse(saved);
  }

  async findByTenantId(tenantId: string): Promise<WorkflowResponse[]> {
    const workflows = await this.workflowRepo.findByTenantId(tenantId);
    return workflows.map((w) => this.mapWorkflowToResponse(w));
  }

  async findById(tenantId: string, workflowId: string): Promise<WorkflowResponse> {
    const workflow = await this.getWorkflowOrThrow(tenantId, workflowId);
    return this.mapWorkflowToResponse(workflow);
  }

  async update(
    tenantId: string,
    workflowId: string,
    dto: UpdateWorkflowDto,
  ): Promise<WorkflowResponse> {
    const workflow = await this.getWorkflowOrThrow(tenantId, workflowId);

    if (dto.name !== undefined) workflow.name = dto.name;
    if (dto.description !== undefined) workflow.description = dto.description;

    const saved = await this.workflowRepo.save(workflow);
    return this.mapWorkflowToResponse(saved);
  }

  async activate(tenantId: string, workflowId: string): Promise<WorkflowResponse> {
    const workflow = await this.getWorkflowOrThrow(tenantId, workflowId);
    if (workflow.isActive) {
      return this.mapWorkflowToResponse(workflow);
    }

    await this.validateForActivation(workflowId);
    workflow.activatedAt = new Date();
    workflow.status = 'active';
    workflow.isActive = true;

    const saved = await this.workflowRepo.save(workflow);
    await this.invalidateTriggerCache(tenantId, workflowId);
    return this.mapWorkflowToResponse(saved);
  }

  async deactivate(tenantId: string, workflowId: string): Promise<WorkflowResponse> {
    const workflow = await this.getWorkflowOrThrow(tenantId, workflowId);
    if (!workflow.isActive) {
      return this.mapWorkflowToResponse(workflow);
    }

    workflow.status = 'paused';
    workflow.isActive = false;

    const saved = await this.workflowRepo.save(workflow);
    await this.invalidateTriggerCache(tenantId, workflowId);
    return this.mapWorkflowToResponse(saved);
  }

  async delete(tenantId: string, workflowId: string): Promise<void> {
    const workflow = await this.getWorkflowOrThrow(tenantId, workflowId);
    if (workflow.isActive) {
      throw new BadRequestException('Cannot delete an active workflow');
    }
    await this.workflowRepo.delete(workflowId);
  }

  async verifyWorkflowInactive(tenantId: string, workflowId: string): Promise<void> {
    const workflow = await this.getWorkflowOrThrow(tenantId, workflowId);
    if (workflow.isActive) {
      throw new BadRequestException('Cannot modify structural fields of an active workflow');
    }
  }

  private async invalidateTriggerCache(tenantId: string, workflowId: string): Promise<void> {
    if (!this.cacheService) return;
    const triggers = await this.triggerRepo.findByWorkflowId(workflowId);
    const events = [...new Set(triggers.map((t) => t.event))];
    for (const event of events) {
      try {
        const key = TriggerCacheService.getCacheKey(tenantId, event);
        await this.cacheService.del(key);
      } catch {
        // Ignore cache deletion errors
      }
    }
  }

  async getWorkflowOrThrow(tenantId: string, workflowId: string): Promise<Workflow> {
    const workflow = await this.workflowRepo.findById(workflowId);
    if (!workflow || workflow.tenantId !== tenantId) {
      throw new NotFoundException('Workflow not found');
    }
    return workflow;
  }

  private async validateForActivation(workflowId: string): Promise<void> {
    const triggers = await this.triggerRepo.findByWorkflowId(workflowId);
    if (triggers.length === 0) {
      throw new BadRequestException('Workflow must have at least one trigger to be activated');
    }

    const steps = await this.stepRepo.findByWorkflowId(workflowId);
    if (steps.length === 0) {
      throw new BadRequestException('Workflow must have at least one step to be activated');
    }

    const firstSteps = steps.filter(
      (s) =>
        !s.parentWorkflowStepId &&
        !steps.some((p) => p.trueStepId === s.id || p.falseStepId === s.id),
    );

    if (firstSteps.length > 1) {
      throw new BadRequestException(
        'Multiple disconnected root steps found. Every step must have a parent node, except the first step.',
      );
    }

    if (firstSteps.length === 1 && firstSteps[0]) {
      const firstStep = firstSteps[0];
      const reachable = new Set<string>();
      const queue = [firstStep.id];

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        reachable.add(currentId);

        const currentStep = steps.find((s) => s.id === currentId);
        if (currentStep) {
          const linearChildren = steps.filter((s) => s.parentWorkflowStepId === currentId);
          for (const child of linearChildren) {
            queue.push(child.id);
          }

          if (currentStep.trueStepId) queue.push(currentStep.trueStepId);
          if (currentStep.falseStepId) queue.push(currentStep.falseStepId);
        }
      }

      if (reachable.size !== steps.length) {
        throw new BadRequestException('Every step must have a parent node, except the first step.');
      }
    } else if (steps.length > 0) {
      throw new BadRequestException(
        'Workflow steps must form a valid tree connected to a single root step.',
      );
    }

    // Extended validation per requirements
    for (const step of steps) {
      if (!step.action) {
        throw new BadRequestException(`A step has no action configured`);
      }

      if (step.action === STEP_ACTIONS.DELAY) {
        if (!step.config?.amount || !step.config?.unit) {
          throw new BadRequestException(`Delay step ${step.id} requires amount and unit`);
        }
        const hasNextStep = steps.some((s) => s.parentWorkflowStepId === step.id);
        if (!hasNextStep) {
          throw new BadRequestException('A delay cannot be the final step in a workflow');
        }
      }

      if (step.action === STEP_ACTIONS.CONDITIONAL_SPLIT) {
        if (!step.trueStepId || !step.falseStepId) {
          // Check if conditions exist in workflow_step_conditions
          const conditionsCount = await this.dataSource.query<{ count: string }[]>(
            `SELECT COUNT(*) FROM workflow_step_conditions WHERE workflow_step_id = $1`,
            [step.id],
          );
          if (!conditionsCount || parseInt(conditionsCount[0]?.count ?? '0') === 0) {
            throw new BadRequestException(
              `A conditional split step must have both true and false step routing or valid conditions in the database`,
            );
          }
        }
      }

      if (step.action === STEP_ACTIONS.SEND_EMAIL) {
        if (!step.config?.templateId && (!step.config?.subject || !step.config?.html)) {
          throw new BadRequestException(
            `An email step requires either templateId OR (subject and html)`,
          );
        }
        if (step.config?.templateId) {
          const templateExists = await this.dataSource.query<{ id: string }[]>(
            `SELECT id FROM email_templates WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1`,
            [step.config.templateId, step.tenantId],
          );
          if (!templateExists || templateExists.length === 0) {
            throw new BadRequestException(
              `An email step references a deleted or non-existent template`,
            );
          }
        }
      }

      if (
        (step.action === STEP_ACTIONS.ATTACH_TAG || step.action === STEP_ACTIONS.DETACH_TAG) &&
        !step.config?.tagId
      ) {
        throw new BadRequestException(`A tag step requires a tag reference`);
      }

      if (step.action === STEP_ACTIONS.WEBHOOK) {
        const urlStr = typeof step.config?.url === 'string' ? step.config.url : '';
        if (!urlStr) {
          throw new BadRequestException(`A webhook step requires a valid URL`);
        }
        try {
          const parsedUrl = new URL(urlStr);
          const hostname = parsedUrl.hostname;
          if (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '0.0.0.0' ||
            hostname === '[::1]' ||
            hostname === '[::]' ||
            hostname.startsWith('10.') ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('169.254.') ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
            /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(hostname) || // CGN 100.64.0.0/10
            /^\[[fF][cC0-9a-fA-F]{3}:/.test(hostname) || // fc00::/7
            /^\[[fF][eE][89aAbB][0-9a-fA-F]:/.test(hostname) // fe80::/10
          ) {
            throw new BadRequestException(`A webhook step has an invalid or private URL`);
          }

          // DNS resolution check
          try {
            const dnsResult = await lookup(hostname);
            const address = dnsResult.address;
            if (
              address === '127.0.0.1' ||
              address === '0.0.0.0' ||
              address === '::1' ||
              address === '::' ||
              address.startsWith('10.') ||
              address.startsWith('192.168.') ||
              address.startsWith('169.254.') ||
              /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(address) ||
              /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(address) ||
              /^[fF][cC0-9a-fA-F]{3}:/.test(address) ||
              /^[fF][eE][89aAbB][0-9a-fA-F]:/.test(address)
            ) {
              throw new BadRequestException(`A webhook step resolves to a private IP`);
            }
          } catch (dnsError) {
            // If DNS resolution fails, block it or let it pass?
            // Usually, if it doesn't resolve, we block it to prevent targeting internal unresolved names.
            if (dnsError instanceof BadRequestException) throw dnsError;
            throw new BadRequestException(`A webhook step domain could not be resolved`);
          }
        } catch (error) {
          if (error instanceof BadRequestException) throw error;
          throw new BadRequestException(`A webhook step has a malformed URL`);
        }
      }
    }

    const lastStep = [...steps].sort((a, b) => a.position - b.position)[steps.length - 1];
    if (lastStep?.action === STEP_ACTIONS.DELAY) {
      throw new BadRequestException('A delay cannot be the final step in a workflow');
    }
  }

  private mapWorkflowToResponse(workflow: Workflow): WorkflowResponse {
    return {
      id: workflow.id,
      tenantId: workflow.tenantId,
      name: workflow.name,
      description: workflow.description ?? undefined,
      isActive: workflow.isActive,
      status: workflow.status,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
      activatedAt: workflow.activatedAt?.toISOString(),
    };
  }

  private mapTriggerToResponse(trigger: WorkflowTrigger): WorkflowTriggerResponse {
    return {
      id: trigger.id,
      tenantId: trigger.tenantId,
      workflowId: trigger.workflowId,
      event: trigger.event,
      filters: trigger.filters ?? undefined,
      createdAt: trigger.createdAt.toISOString(),
      updatedAt: trigger.updatedAt.toISOString(),
    };
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
