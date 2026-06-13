import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest';
import { WorkflowController } from './workflow.controller';
import type { WorkflowService } from '../application/services/workflow.service';
import type { WorkflowStepService } from '../application/services/workflow-step.service';
import type { WorkflowTriggerService } from '../application/services/workflow-trigger.service';
import type { WorkflowExitConditionService } from '../application/services/workflow-exit-condition.service';
import type {
  WorkflowResponse,
  CreateWorkflowExitConditionDto,
} from '@email-automation-engine/shared';
import {
  STEP_ACTIONS,
  LOGICAL_OPERATORS,
  CONDITION_TYPES,
  CONDITION_OPERATORS,
} from '@email-automation-engine/shared';

describe('WorkflowController', () => {
  let controller: WorkflowController;
  let workflowService: {
    create: Mock;
    findByTenantId: Mock;
    findById: Mock;
    update: Mock;
    activate: Mock;
    deactivate: Mock;
    delete: Mock;
  };
  let triggerService: {
    getTriggers: Mock;
    addTrigger: Mock;
    updateTrigger: Mock;
    deleteTrigger: Mock;
  };
  let stepService: {
    getSteps: Mock;
    addStep: Mock;
    findStep: Mock;
    updateStep: Mock;
    deleteStep: Mock;
    reorderStep: Mock;
  };
  let exitConditionService: {
    getExitConditions: Mock;
    replaceExitConditions: Mock;
    addExitCondition: Mock;
    updateExitCondition: Mock;
    deleteExitCondition: Mock;
  };

  beforeEach(() => {
    workflowService = {
      create: vi.fn(),
      findByTenantId: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      delete: vi.fn(),
    };
    triggerService = {
      getTriggers: vi.fn(),
      addTrigger: vi.fn(),
      updateTrigger: vi.fn(),
      deleteTrigger: vi.fn(),
    };
    stepService = {
      getSteps: vi.fn(),
      addStep: vi.fn(),
      findStep: vi.fn(),
      updateStep: vi.fn(),
      deleteStep: vi.fn(),
      reorderStep: vi.fn(),
    };
    exitConditionService = {
      getExitConditions: vi.fn(),
      replaceExitConditions: vi.fn(),
      addExitCondition: vi.fn(),
      updateExitCondition: vi.fn(),
      deleteExitCondition: vi.fn(),
    };
    controller = new WorkflowController(
      workflowService as unknown as WorkflowService,
      triggerService as unknown as WorkflowTriggerService,
      stepService as unknown as WorkflowStepService,
      exitConditionService as unknown as WorkflowExitConditionService,
    );
  });

  describe('create', () => {
    it('should create a workflow', async () => {
      const mockResponse: WorkflowResponse = {
        id: 'workflow-1',
        tenantId: 'tenant-1',
        name: 'Welcome',
        isActive: false,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      workflowService.create.mockResolvedValue(mockResponse);

      const result = await controller.create('tenant-1', { name: 'Welcome' });
      expect(result).toEqual(mockResponse);
      expect(workflowService.create).toHaveBeenCalledWith('tenant-1', { name: 'Welcome' });
    });
  });

  describe('triggers', () => {
    it('should delegate getTriggers to service', async () => {
      triggerService.getTriggers.mockResolvedValue([]);

      const result = await controller.getTriggers('tenant-1', 'workflow-1');
      expect(result).toEqual([]);
      expect(triggerService.getTriggers).toHaveBeenCalledWith('tenant-1', 'workflow-1');
    });
  });

  describe('steps', () => {
    it('should delegate getSteps to service', async () => {
      stepService.getSteps.mockResolvedValue([]);

      const result = await controller.getSteps('tenant-1', 'workflow-1');
      expect(result).toEqual([]);
      expect(stepService.getSteps).toHaveBeenCalledWith('tenant-1', 'workflow-1');
    });
  });

  describe('findStep', () => {
    it('should delegate to service findStep', async () => {
      const mockStep = { id: 'step-1', action: STEP_ACTIONS.SEND_EMAIL };
      stepService.findStep.mockResolvedValue(mockStep);

      const result = await controller.findStep('tenant-1', 'workflow-1', 'step-1');
      expect(result).toEqual(mockStep);
      expect(stepService.findStep).toHaveBeenCalledWith('tenant-1', 'workflow-1', 'step-1');
    });
  });

  describe('reorderStep', () => {
    it('should delegate to service reorderStep', async () => {
      const mockResponse = { id: 'step-1', parentWorkflowStepId: 'step-2' };
      stepService.reorderStep.mockResolvedValue(mockResponse);

      const dto = { parentId: 'step-2', branch: 'linear' as const };
      const result = await controller.reorderStep('tenant-1', 'workflow-1', 'step-1', dto);
      expect(result).toEqual(mockResponse);
      expect(stepService.reorderStep).toHaveBeenCalledWith('tenant-1', 'workflow-1', 'step-1', dto);
    });
  });

  describe('exit conditions', () => {
    it('should delegate getExitConditions to service', async () => {
      exitConditionService.getExitConditions.mockResolvedValue([]);

      const result = await controller.getExitConditions('tenant-1', 'workflow-1');
      expect(result).toEqual([]);
      expect(exitConditionService.getExitConditions).toHaveBeenCalledWith('tenant-1', 'workflow-1');
    });

    it('should delegate replaceExitConditions to service', async () => {
      const dtos: CreateWorkflowExitConditionDto[] = [
        {
          logicalOperator: LOGICAL_OPERATORS.ALL,
          type: CONDITION_TYPES.TAG_HAS,
          resource: 'unsubscribed',
          operator: CONDITION_OPERATORS.EQUALS,
          value: 'true',
        },
      ];
      exitConditionService.replaceExitConditions.mockResolvedValue([]);

      const result = await controller.replaceExitConditions('tenant-1', 'workflow-1', dtos);
      expect(result).toEqual([]);
      expect(exitConditionService.replaceExitConditions).toHaveBeenCalledWith(
        'tenant-1',
        'workflow-1',
        dtos,
      );
    });
  });
});
