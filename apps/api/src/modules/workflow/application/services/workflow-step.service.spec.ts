import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { WorkflowStepService } from './workflow-step.service';
import type { Workflow } from '../../domain/aggregates/workflow.aggregate';
import type { WorkflowService } from './workflow.service';

describe('WorkflowStepService', () => {
  let service: WorkflowStepService;
  let stepRepo: { findByWorkflowId: Mock; save: Mock; delete: Mock };
  let workflowService: { verifyWorkflowInactive: Mock; getWorkflowOrThrow: Mock; findById: Mock };

  beforeEach(() => {
    stepRepo = {
      findByWorkflowId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    workflowService = {
      verifyWorkflowInactive: vi.fn(),
      getWorkflowOrThrow: vi.fn(),
      findById: vi.fn(),
    };

    service = new WorkflowStepService(
      stepRepo as unknown as (typeof service)['stepRepo'],
      workflowService as unknown as WorkflowService,
    );
  });

  describe('getSteps', () => {
    it('should return mapped steps', async () => {
      workflowService.findById.mockResolvedValue({});
      const mockSteps = [
        {
          id: 'step-1',
          tenantId: 'tenant-1',
          workflowId: 'workflow-1',
          action: 'send_email',
          position: 0,
          config: {},
          parentWorkflowStepId: null,
          trueStepId: null,
          falseStepId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      stepRepo.findByWorkflowId.mockResolvedValue(mockSteps);

      const result = await service.getSteps('tenant-1', 'workflow-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('step-1');
      expect(result[0].parentWorkflowStepId).toBeNull();
      expect(stepRepo.findByWorkflowId).toHaveBeenCalledWith('workflow-1');
    });
  });

  describe('structural rules', () => {
    it('should reject parentWorkflowStepId if it belongs to different workflow', async () => {
      workflowService.verifyWorkflowInactive.mockResolvedValue(undefined);
      stepRepo.findByWorkflowId.mockResolvedValue([{ id: 'step-1' }]);

      await expect(
        service.addStep('tenant-1', 'workflow-1', {
          action: 'send_email',
          parentWorkflowStepId: 'unknown-id',
        }),
      ).rejects.toThrow('Parent step must belong to the same workflow');
    });
  });

  describe('findStep', () => {
    it('should return a step by id', async () => {
      workflowService.getWorkflowOrThrow.mockResolvedValue({ id: 'workflow-1' } as Workflow);
      stepRepo.findByWorkflowId.mockResolvedValue([
        {
          id: 'step-1',
          tenantId: 'tenant-1',
          workflowId: 'workflow-1',
          action: 'send_email',
          position: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.findStep('tenant-1', 'workflow-1', 'step-1');
      expect(result.id).toBe('step-1');
    });

    it('should throw NotFoundException for missing step', async () => {
      workflowService.getWorkflowOrThrow.mockResolvedValue({ id: 'workflow-1' } as Workflow);
      stepRepo.findByWorkflowId.mockResolvedValue([]);

      await expect(service.findStep('tenant-1', 'workflow-1', 'step-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reorderStep', () => {
    it('should throw NotFoundException if step to move is not found', async () => {
      workflowService.verifyWorkflowInactive.mockResolvedValue(undefined);
      stepRepo.findByWorkflowId.mockResolvedValue([]);

      await expect(
        service.reorderStep('tenant-1', 'workflow-1', 'missing-step', {
          parentId: null,
          branch: 'linear' as const,
        }),
      ).rejects.toThrow('Step not found');
    });

    it('should reorder step as root if parentId is null', async () => {
      workflowService.verifyWorkflowInactive.mockResolvedValue(undefined);
      const mockStep = {
        id: 'step-1',
        parentWorkflowStepId: 'step-0',
        trueStepId: null,
        falseStepId: null,
        action: 'send_email',
        tenantId: 'tenant-1',
        workflowId: 'workflow-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      stepRepo.findByWorkflowId.mockResolvedValue([mockStep]);
      stepRepo.save.mockResolvedValue({ ...mockStep, parentWorkflowStepId: null });

      const result = await service.reorderStep('tenant-1', 'workflow-1', 'step-1', {
        parentId: null,
        branch: 'linear' as const,
      });

      expect(result.id).toBe('step-1');
      expect(result.parentWorkflowStepId).toBeNull();
      expect(stepRepo.save).toHaveBeenCalled();
    });
  });
});
