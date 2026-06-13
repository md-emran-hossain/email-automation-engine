import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './watch-workflow-steps.handler';
import type { Mocked } from 'vitest';
import type { DataSource } from 'typeorm';
import type { QueueService } from '../infrastructure/queue/queue.interface';
import { STEP_ACTIONS } from '@email-automation-engine/shared';

describe('watch-workflow-steps.handler', () => {
  let queueService: Mocked<QueueService>;
  let dataSource: Mocked<DataSource>;

  beforeEach(() => {
    queueService = {
      sendMessage: vi.fn().mockResolvedValue(undefined),
      sendMessages: vi.fn().mockResolvedValue(undefined),
    };
    dataSource = {
      query: vi.fn(),
    } as unknown as Mocked<DataSource>;
  });

  it('should process due steps and enqueue to finished queue', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('SELECT')) {
        return [
          {
            contact_workflow_step_id: 'contact-workflow-step-1',
            tenant_id: 'tenant-1',
            contact_workflow_id: 'contact-workflow-1',
            workflow_step_id: 'workflow-step-1',
            contact_id: 'contact-1',
            workflow_id: 'workflow-1',
            action: STEP_ACTIONS.DELAY,
          },
        ];
      }
      if (query.includes('UPDATE')) return [[], 1]; // pg style: [rows, rowCount]
      return [];
    });

    await handler({}, { queueService, dataSource });

    expect(queueService.sendMessage).toHaveBeenCalledTimes(1);
    const queuedMsg = queueService.sendMessage.mock.calls[0][1] as {
      action: string;
      contactWorkflowId: string;
    };
    expect(queuedMsg.action).toBe(STEP_ACTIONS.DELAY);
    expect(queuedMsg.contactWorkflowId).toBe('contact-workflow-1');
  });

  it('should skip if no due steps', async () => {
    dataSource.query.mockResolvedValue([]);

    await handler({}, { queueService, dataSource });

    expect(queueService.sendMessage).not.toHaveBeenCalled();
  });

  it('should handle partial failure and continue processing', async () => {
    dataSource.query.mockImplementation(async (query: string, params?: unknown[]) => {
      if (query.includes('SELECT')) {
        return [
          {
            contact_workflow_step_id: 'contact-workflow-step-1',
            tenant_id: 'tenant-1',
            contact_workflow_id: 'contact-workflow-1',
            workflow_step_id: 'workflow-step-1',
            contact_id: 'contact-1',
            workflow_id: 'workflow-1',
            action: STEP_ACTIONS.DELAY,
          },
          {
            contact_workflow_step_id: 'contact-workflow-step-2', // This one will throw
            tenant_id: 'tenant-1',
            contact_workflow_id: 'contact-workflow-2',
            workflow_step_id: 'workflow-step-2',
            contact_id: 'contact-2',
            workflow_id: 'workflow-1',
            action: STEP_ACTIONS.DELAY,
          },
          {
            contact_workflow_step_id: 'contact-workflow-step-3',
            tenant_id: 'tenant-1',
            contact_workflow_id: 'contact-workflow-3',
            workflow_step_id: 'workflow-step-3',
            contact_id: 'contact-3',
            workflow_id: 'workflow-1',
            action: STEP_ACTIONS.DELAY,
          },
        ];
      }
      if (query.includes('UPDATE')) {
        if (params && params[0] === 'contact-workflow-step-2') {
          throw new Error('Database disconnected during update');
        }
        return [{ id: params ? params[0] : 'unknown' }]; // Return success for others
      }
      return [];
    });

    await handler({}, { queueService, dataSource });

    // It should have continued past the error and processed cws1 and cws3
    expect(queueService.sendMessage).toHaveBeenCalledTimes(2);
    const firstCall = queueService.sendMessage.mock.calls[0][1] as { contactWorkflowId: string };
    const secondCall = queueService.sendMessage.mock.calls[1][1] as { contactWorkflowId: string };

    expect(firstCall.contactWorkflowId).toBe('contact-workflow-1');
    expect(secondCall.contactWorkflowId).toBe('contact-workflow-3');
  });

  it('should skip step if already picked up by another worker (idempotency)', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('SELECT')) {
        return [
          {
            contact_workflow_step_id: 'contact-workflow-step-1',
            tenant_id: 'tenant-1',
            contact_workflow_id: 'contact-workflow-1',
            workflow_step_id: 'workflow-step-1',
            contact_id: 'contact-1',
            workflow_id: 'workflow-1',
            action: STEP_ACTIONS.DELAY,
          },
        ];
      }
      if (query.includes('UPDATE')) {
        return []; // Simulate another worker already updating the row (no returning id)
      }
      return [];
    });

    await handler({}, { queueService, dataSource });

    // Should not enqueue message if update didn't return an id
    expect(queueService.sendMessage).not.toHaveBeenCalled();
  });
});
