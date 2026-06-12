import { Controller, Get, Post, Patch, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { WorkflowService } from '../application/services/workflow.service';
import { WorkflowTriggerService } from '../application/services/workflow-trigger.service';
import { WorkflowStepService } from '../application/services/workflow-step.service';
import { WorkflowExitConditionService } from '../application/services/workflow-exit-condition.service';
import { AuthGuard } from '../../iam/interface/guards/auth.guard';
import { TenantMembershipGuard } from '../../iam/interface/guards/tenant-membership.guard';
import { PermissionsGuard } from '../../iam/interface/guards/permissions.guard';
import { CurrentTenant } from '../../iam/interface/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../iam/interface/decorators/require-permissions.decorator';
import {
  type CreateWorkflowDto,
  CreateWorkflowSchema,
  type UpdateWorkflowDto,
  UpdateWorkflowSchema,
  type WorkflowResponse,
  type CreateWorkflowTriggerDto,
  CreateWorkflowTriggerSchema,
  type UpdateWorkflowTriggerDto,
  UpdateWorkflowTriggerSchema,
  type WorkflowTriggerResponse,
  type CreateWorkflowStepDto,
  CreateWorkflowStepSchema,
  type UpdateWorkflowStepDto,
  UpdateWorkflowStepSchema,
  type ReorderWorkflowStepDto,
  ReorderWorkflowStepSchema,
  type WorkflowStepResponse,
  type CreateWorkflowExitConditionDto,
  CreateWorkflowExitConditionSchema,
  type UpdateWorkflowExitConditionDto,
  UpdateWorkflowExitConditionSchema,
  type WorkflowExitConditionResponse,
} from '@email-automation-engine/shared';
import { ZodValidationPipe } from '../../../infrastructure/pipes/zod-validation.pipe';

@Controller('tenants/:tenantId/workflows')
@UseGuards(AuthGuard, TenantMembershipGuard, PermissionsGuard)
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly triggerService: WorkflowTriggerService,
    private readonly stepService: WorkflowStepService,
    private readonly exitConditionService: WorkflowExitConditionService,
  ) {}

  @Post()
  @RequirePermissions('workflows.manage')
  async create(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(CreateWorkflowSchema)) dto: CreateWorkflowDto,
  ): Promise<WorkflowResponse> {
    return this.workflowService.create(tenantId, dto);
  }

  @Get()
  @RequirePermissions('workflows.read')
  async findAll(@CurrentTenant('id') tenantId: string): Promise<WorkflowResponse[]> {
    return this.workflowService.findByTenantId(tenantId);
  }

  @Get(':id')
  @RequirePermissions('workflows.read')
  async findOne(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ): Promise<WorkflowResponse> {
    return this.workflowService.findById(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('workflows.manage')
  async update(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateWorkflowSchema)) dto: UpdateWorkflowDto,
  ): Promise<WorkflowResponse> {
    return this.workflowService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('workflows.manage')
  async remove(@CurrentTenant('id') tenantId: string, @Param('id') id: string): Promise<void> {
    return this.workflowService.delete(tenantId, id);
  }

  @Patch(':id/activate')
  @RequirePermissions('workflows.activate')
  async activate(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ): Promise<WorkflowResponse> {
    return this.workflowService.activate(tenantId, id);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('workflows.activate')
  async deactivate(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ): Promise<WorkflowResponse> {
    return this.workflowService.deactivate(tenantId, id);
  }

  @Get(':id/triggers')
  @RequirePermissions('workflows.read')
  async getTriggers(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ): Promise<WorkflowTriggerResponse[]> {
    return this.triggerService.getTriggers(tenantId, id);
  }

  @Post(':id/triggers')
  @RequirePermissions('workflows.manage')
  async addTrigger(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateWorkflowTriggerSchema)) dto: CreateWorkflowTriggerDto,
  ): Promise<WorkflowTriggerResponse> {
    return this.triggerService.addTrigger(tenantId, id, dto);
  }

  @Patch(':id/triggers/:triggerId')
  @RequirePermissions('workflows.manage')
  async updateTrigger(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Param('triggerId') triggerId: string,
    @Body(new ZodValidationPipe(UpdateWorkflowTriggerSchema)) dto: UpdateWorkflowTriggerDto,
  ): Promise<WorkflowTriggerResponse> {
    return this.triggerService.updateTrigger(tenantId, id, triggerId, dto);
  }

  @Delete(':id/triggers/:triggerId')
  @RequirePermissions('workflows.manage')
  async deleteTrigger(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Param('triggerId') triggerId: string,
  ): Promise<void> {
    return this.triggerService.deleteTrigger(tenantId, id, triggerId);
  }

  @Get(':id/steps')
  @RequirePermissions('workflows.read')
  async getSteps(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ): Promise<WorkflowStepResponse[]> {
    return this.stepService.getSteps(tenantId, id);
  }

  @Post(':id/steps')
  @RequirePermissions('workflows.manage')
  async addStep(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateWorkflowStepSchema)) dto: CreateWorkflowStepDto,
  ): Promise<WorkflowStepResponse> {
    return this.stepService.addStep(tenantId, id, dto);
  }

  @Get(':id/steps/:stepId')
  @RequirePermissions('workflows.read')
  async findStep(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
  ): Promise<WorkflowStepResponse> {
    return this.stepService.findStep(tenantId, id, stepId);
  }

  @Post(':id/steps/:stepId/reorder')
  @RequirePermissions('workflows.manage')
  async reorderStep(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body(new ZodValidationPipe(ReorderWorkflowStepSchema)) dto: ReorderWorkflowStepDto,
  ): Promise<WorkflowStepResponse> {
    return this.stepService.reorderStep(tenantId, id, stepId, dto);
  }

  @Patch(':id/steps/:stepId')
  @RequirePermissions('workflows.manage')
  async updateStep(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body(new ZodValidationPipe(UpdateWorkflowStepSchema)) dto: UpdateWorkflowStepDto,
  ): Promise<WorkflowStepResponse> {
    return this.stepService.updateStep(tenantId, id, stepId, dto);
  }

  @Delete(':id/steps/:stepId')
  @RequirePermissions('workflows.manage')
  async deleteStep(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
  ): Promise<void> {
    return this.stepService.deleteStep(tenantId, id, stepId);
  }

  @Get(':id/exit-conditions')
  @RequirePermissions('workflows.read')
  async getExitConditions(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ): Promise<WorkflowExitConditionResponse[]> {
    return this.exitConditionService.getExitConditions(tenantId, id);
  }

  @Put(':id/exit-conditions')
  @RequirePermissions('workflows.manage')
  async replaceExitConditions(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(z.array(CreateWorkflowExitConditionSchema)))
    dtos: CreateWorkflowExitConditionDto[],
  ): Promise<WorkflowExitConditionResponse[]> {
    return this.exitConditionService.replaceExitConditions(tenantId, id, dtos);
  }

  @Post(':id/exit-conditions')
  @RequirePermissions('workflows.manage')
  async addExitCondition(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateWorkflowExitConditionSchema))
    dto: CreateWorkflowExitConditionDto,
  ): Promise<WorkflowExitConditionResponse> {
    return this.exitConditionService.addExitCondition(tenantId, id, dto);
  }

  @Patch(':id/exit-conditions/:conditionId')
  @RequirePermissions('workflows.manage')
  async updateExitCondition(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Param('conditionId') conditionId: string,
    @Body(new ZodValidationPipe(UpdateWorkflowExitConditionSchema))
    dto: UpdateWorkflowExitConditionDto,
  ): Promise<WorkflowExitConditionResponse> {
    return this.exitConditionService.updateExitCondition(tenantId, id, conditionId, dto);
  }

  @Delete(':id/exit-conditions/:conditionId')
  @RequirePermissions('workflows.manage')
  async deleteExitCondition(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Param('conditionId') conditionId: string,
  ): Promise<void> {
    return this.exitConditionService.deleteExitCondition(tenantId, id, conditionId);
  }
}
