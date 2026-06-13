import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import type { Workflow } from '../../domain/aggregates/workflow.aggregate';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let workflowRepo: { findById: Mock; findByTenantId: Mock; save: Mock; delete: Mock };
  let triggerRepo: { findByWorkflowId: Mock; save: Mock; delete: Mock };
  let stepRepo: { findByWorkflowId: Mock; save: Mock; delete: Mock };
  let exitConditionRepo: {
    findByWorkflowId: Mock;
    save: Mock;
    delete: Mock;
    deleteByWorkflowId: Mock;
  };
  let dataSource: { query: Mock; transaction: Mock };

  beforeEach(() => {
    workflowRepo = {
      findById: vi.fn(),
      findByTenantId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    triggerRepo = {
      findByWorkflowId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    stepRepo = {
      findByWorkflowId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    exitConditionRepo = {
      findByWorkflowId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      deleteByWorkflowId: vi.fn(),
    };
    dataSource = {
      query: vi.fn().mockResolvedValue([{ count: '0' }]),
      transaction: vi.fn().mockImplementation(async (cb) => {
        return cb({ save: vi.fn() });
      }),
    };

    service = new WorkflowService(
      workflowRepo as unknown as (typeof service)['workflowRepo'],
      triggerRepo as unknown as (typeof service)['triggerRepo'],
      stepRepo as unknown as (typeof service)['stepRepo'],
      exitConditionRepo as unknown as (typeof service)['exitConditionRepo'],
      dataSource as unknown as (typeof service)['dataSource'],
    );
  });

  describe('create', () => {
    it('should create a workflow', async () => {
      workflowRepo.save.mockImplementation((w: Workflow) => {
        w.id = 'workflow-1';
        w.createdAt = new Date();
        w.updatedAt = new Date();
        w.isActive = false;
        w.status = 'draft';
        return Promise.resolve(w);
      });

      const result = await service.create('tenant-1', { name: 'Welcome Series' });
      expect(result.id).toBe('workflow-1');
      expect(result.name).toBe('Welcome Series');
      expect(result.tenantId).toBe('tenant-1');
      expect(result.isActive).toBe(false);
      expect(result.status).toBe('draft');
    });
  });

  describe('findById', () => {
    it('should return workflow by id', async () => {
      workflowRepo.findById.mockResolvedValue({
        id: 'workflow-1',
        tenantId: 'tenant-1',
        name: 'Welcome',
        isActive: false,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findById('tenant-1', 'workflow-1');
      expect(result.id).toBe('workflow-1');
    });

    it('should throw NotFoundException for wrong tenant', async () => {
      workflowRepo.findById.mockResolvedValue({
        id: 'workflow-1',
        tenantId: 'tenant-2',
      });

      await expect(service.findById('tenant-1', 'workflow-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for missing workflow', async () => {
      workflowRepo.findById.mockResolvedValue(null);

      await expect(service.findById('tenant-1', 'workflow-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete an inactive workflow', async () => {
      workflowRepo.findById.mockResolvedValue({
        id: 'workflow-1',
        tenantId: 'tenant-1',
        isActive: false,
      });

      await service.delete('tenant-1', 'workflow-1');
      expect(workflowRepo.delete).toHaveBeenCalledWith('workflow-1');
    });

    it('should reject deleting an active workflow', async () => {
      workflowRepo.findById.mockResolvedValue({
        id: 'workflow-1',
        tenantId: 'tenant-1',
        isActive: true,
      });

      await expect(service.delete('tenant-1', 'workflow-1')).rejects.toThrow(
        'Cannot delete an active workflow',
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate an active workflow', async () => {
      const mockWorkflow = {
        id: 'workflow-1',
        tenantId: 'tenant-1',
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        name: 'Welcome',
      };
      workflowRepo.findById.mockResolvedValue(mockWorkflow);
      workflowRepo.save.mockImplementation((w: Workflow) => Promise.resolve(w));

      const result = await service.deactivate('tenant-1', 'workflow-1');
      expect(result.isActive).toBe(false);
      expect(result.status).toBe('paused');
    });

    it('should be idempotent for inactive workflow', async () => {
      const mockWorkflow = {
        id: 'workflow-1',
        tenantId: 'tenant-1',
        isActive: false,
        status: 'paused',
        createdAt: new Date(),
        updatedAt: new Date(),
        name: 'Welcome',
      };
      workflowRepo.findById.mockResolvedValue(mockWorkflow);

      const result = await service.deactivate('tenant-1', 'workflow-1');
      expect(result.isActive).toBe(false);
      expect(workflowRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    const mockWorkflow = {
      id: 'workflow-1',
      tenantId: 'tenant-1',
      name: 'Welcome',
      isActive: false,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should throw BadRequestException if activating without triggers', async () => {
      workflowRepo.findById.mockResolvedValue({ ...mockWorkflow });
      triggerRepo.findByWorkflowId.mockResolvedValue([]);

      await expect(service.activate('tenant-1', 'workflow-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if activating without steps', async () => {
      workflowRepo.findById.mockResolvedValue({ ...mockWorkflow });
      triggerRepo.findByWorkflowId.mockResolvedValue([{ id: 'trigger-1' }]);
      stepRepo.findByWorkflowId.mockResolvedValue([]);

      await expect(service.activate('tenant-1', 'workflow-1')).rejects.toThrow(BadRequestException);
    });

    it('should activate successfully if valid triggers and steps exist', async () => {
      workflowRepo.findById.mockResolvedValue({ ...mockWorkflow });
      triggerRepo.findByWorkflowId.mockResolvedValue([{ id: 'trigger-1' }]);
      stepRepo.findByWorkflowId.mockResolvedValue([
        { id: 'step-1', action: 'send_email', position: 0, config: { templateId: 'template-1' } },
      ]);
      workflowRepo.save.mockImplementation((workflow: Workflow) => Promise.resolve(workflow));

      const result = await service.activate('tenant-1', 'workflow-1');
      expect(result.isActive).toBe(true);
      expect(result.status).toBe('active');
      expect(result.activatedAt).toBeDefined();
    });

    it('should fail if final step is delay', async () => {
      workflowRepo.findById.mockResolvedValue({ ...mockWorkflow });
      triggerRepo.findByWorkflowId.mockResolvedValue([{ id: 'trigger-1' }]);
      stepRepo.findByWorkflowId.mockResolvedValue([
        { id: 'step-1', action: 'delay', position: 0, config: { amount: 10, unit: 'minutes' } },
      ]);

      await expect(service.activate('tenant-1', 'workflow-1')).rejects.toThrow(
        'A delay cannot be the final step in a workflow',
      );
    });

    it('should fail if delay step is missing amount/unit', async () => {
      workflowRepo.findById.mockResolvedValue({ ...mockWorkflow });
      triggerRepo.findByWorkflowId.mockResolvedValue([{ id: 'trigger-1' }]);
      stepRepo.findByWorkflowId.mockResolvedValue([
        { id: 'step-1', action: 'delay', position: 0, config: {} },
        {
          id: 'step-2',
          action: 'send_email',
          position: 1,
          config: { templateId: 'template-1' },
          parentWorkflowStepId: 'step-1',
        },
      ]);

      await expect(service.activate('tenant-1', 'workflow-1')).rejects.toThrow(
        'Delay step step-1 requires amount and unit',
      );
    });

    it('should fail if conditional_split step is missing routing', async () => {
      workflowRepo.findById.mockResolvedValue({ ...mockWorkflow });
      triggerRepo.findByWorkflowId.mockResolvedValue([{ id: 'trigger-1' }]);
      stepRepo.findByWorkflowId.mockResolvedValue([
        { id: 'step-1', action: 'conditional_split', position: 0 },
      ]);

      await expect(service.activate('tenant-1', 'workflow-1')).rejects.toThrow(
        'must have both true and false step routing',
      );
    });

    it('should fail if email step is missing template config', async () => {
      workflowRepo.findById.mockResolvedValue({ ...mockWorkflow });
      triggerRepo.findByWorkflowId.mockResolvedValue([{ id: 'trigger-1' }]);
      stepRepo.findByWorkflowId.mockResolvedValue([
        { id: 'step-1', action: 'send_email', position: 0, config: {} },
      ]);

      await expect(service.activate('tenant-1', 'workflow-1')).rejects.toThrow(
        'requires either templateId OR (subject and html)',
      );
    });

    it('should fail if tag step is missing tagId', async () => {
      workflowRepo.findById.mockResolvedValue({ ...mockWorkflow });
      triggerRepo.findByWorkflowId.mockResolvedValue([{ id: 'trigger-1' }]);
      stepRepo.findByWorkflowId.mockResolvedValue([
        { id: 'step-1', action: 'attach_tag', position: 0, config: {} },
      ]);

      await expect(service.activate('tenant-1', 'workflow-1')).rejects.toThrow(
        'requires a tag reference',
      );
    });

    it('should fail if webhook step is missing url', async () => {
      workflowRepo.findById.mockResolvedValue({ ...mockWorkflow });
      triggerRepo.findByWorkflowId.mockResolvedValue([{ id: 'trigger-1' }]);
      stepRepo.findByWorkflowId.mockResolvedValue([
        { id: 'step-1', action: 'webhook', position: 0, config: {} },
      ]);

      await expect(service.activate('tenant-1', 'workflow-1')).rejects.toThrow(
        'requires a valid URL',
      );
    });
  });
});
