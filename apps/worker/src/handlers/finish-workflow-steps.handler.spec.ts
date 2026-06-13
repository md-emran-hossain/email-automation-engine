import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './finish-workflow-steps.handler';
import type { SqsBatchEvent } from '../infrastructure/queue/sqs-record.parser';
import type { Mocked } from 'vitest';
import type { DataSource } from 'typeorm';
import type { QueueService } from '../infrastructure/queue/queue.interface';
import type { CacheService } from '../infrastructure/cache/cache.interface';
import { CONDITION_TYPES, STEP_ACTIONS, LOGICAL_OPERATORS } from '@email-automation-engine/shared';

describe('finish-workflow-steps.handler', () => {
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

  const createEvent = (messages: Record<string, unknown>[]): SqsBatchEvent => ({
    Records: messages.map((message, index) => ({
      messageId: `msg-${index}`,
      receiptHandle: `handle-${index}`,
      body: JSON.stringify(message),
    })),
  });

  const validMsg = {
    version: 1,
    messageId: '77777777-7777-4777-a777-777777777777',
    tenantId: '11111111-1111-4111-a111-111111111111',
    createdAt: '2024-01-01T00:00:00Z',
    contactId: '22222222-2222-4222-a222-222222222222',
    contactWorkflowId: '66666666-6666-4666-a666-666666666666',
    workflowId: '33333333-3333-4333-a333-333333333333',
    workflowStepId: '44444444-4444-4444-a444-444444444444',
    contactWorkflowStepId: '55555555-5555-4555-a555-555555555555',
    action: STEP_ACTIONS.DELAY,
  };

  it('should process and enqueue next step', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM contact_workflow_steps'))
        return [{ id: 'cw_step_1', status: 'pending' }];
      if (query.includes('UPDATE contact_workflow_steps')) return [];
      if (query.includes('FROM workflow_steps WHERE id ='))
        return [{ id: 'ws1', position: 1, action: STEP_ACTIONS.DELAY }]; // For current step
      if (query.includes('FROM workflow_steps WHERE workflow_id =')) return [{ id: 'ws2' }]; // For next step query
      if (query.includes('SELECT action FROM workflow_steps'))
        return [{ action: STEP_ACTIONS.SEND_EMAIL }]; // For next step action query
      if (query.includes('FROM workflow_exit_conditions')) return [];
      return [];
    });

    const msg = { ...validMsg };

    const result = await handler(createEvent([msg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(queueService.sendMessage).toHaveBeenCalledTimes(1);
    const queuedMsg = queueService.sendMessage.mock.calls[0][1] as {
      workflowStepId: string;
    };
    expect(queuedMsg.workflowStepId).toBe('ws2');
  });

  it('should finish workflow if no next step', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM contact_workflow_steps'))
        return [{ id: 'cw_step_1', status: 'pending' }];
      if (query.includes('UPDATE contact_workflow_steps')) return [];
      if (query.includes('FROM workflow_steps WHERE id ='))
        return [{ id: 'ws1', position: 1, action: STEP_ACTIONS.DELAY }];
      if (query.includes('FROM workflow_steps WHERE workflow_id =')) return []; // No next step
      if (query.includes('FROM workflow_exit_conditions')) return [];
      return [];
    });

    const msg = { ...validMsg };

    const result = await handler(createEvent([msg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(queueService.sendMessage).not.toHaveBeenCalled();
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining(`UPDATE contact_workflows SET status = 'finished'`),
      ['66666666-6666-4666-a666-666666666666'],
    );
  });

  it('should handle conditional split routing based on result', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM contact_workflow_steps'))
        return [{ id: 'cw_step_1', status: 'pending' }];
      if (query.includes('FROM workflow_steps WHERE id = $1'))
        return [
          {
            id: 'ws1',
            position: 1,
            action: STEP_ACTIONS.CONDITIONAL_SPLIT,
            true_step_id: 'true_step',
            false_step_id: 'false_step',
          },
        ];
      if (query.includes('FROM workflow_steps WHERE id = $1') && !query.includes('position'))
        return [{ action: STEP_ACTIONS.SEND_EMAIL }]; // Fetching next step action
      if (query.includes('FROM workflow_exit_conditions')) return [];
      return [];
    });

    const msg = {
      ...validMsg,
      action: STEP_ACTIONS.CONDITIONAL_SPLIT,
      conditionalSplitResult: true,
    };

    const result = await handler(createEvent([msg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(queueService.sendMessage).toHaveBeenCalledTimes(1);
    const queuedMsg = queueService.sendMessage.mock.calls[0][1] as {
      workflowStepId: string;
    };
    expect(queuedMsg.workflowStepId).toBe('true_step');
  });

  it('should exit workflow if exit condition is met', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM contact_workflow_steps'))
        return [{ id: 'cw_step_1', status: 'pending' }];
      if (query.includes('FROM workflow_steps WHERE id ='))
        return [{ id: 'ws1', position: 1, action: STEP_ACTIONS.DELAY }];
      if (query.includes('FROM workflow_exit_conditions'))
        return [
          { type: CONDITION_TYPES.CONTACT_UNSUBSCRIBED, logical_operator: LOGICAL_OPERATORS.ANY },
        ];
      if (query.includes('FROM contacts')) return [{ subscribed: false }]; // Contact is unsubscribed, matches condition
      if (query.includes('FROM contact_tags')) return [];
      return [];
    });

    const msg = { ...validMsg };

    const result = await handler(createEvent([msg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(queueService.sendMessage).not.toHaveBeenCalled();
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining(`UPDATE contact_workflows SET status = 'finished'`),
      ['66666666-6666-4666-a666-666666666666'],
    );
  });

  it('should skip processing if step is not in pending or running state (idempotency)', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM contact_workflow_steps'))
        return [{ id: 'cw_step_1', status: 'completed' }]; // Already completed!
      if (query.includes('UPDATE contact_workflow_steps')) return [];
      return [];
    });

    const msg = { ...validMsg };

    const result = await handler(createEvent([msg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(queueService.sendMessage).not.toHaveBeenCalled(); // Deduped, so no message sent
  });

  it('should handle partial batch failure', async () => {
    dataSource.query.mockImplementation(async (query: string, params?: unknown[]) => {
      if (params && params[0] === 'error-cw') throw new Error('DB Error'); // Fails only for error-cw

      if (query.includes('FROM contact_workflow_steps'))
        return [{ id: 'cw_step_1', status: 'pending' }];
      if (query.includes('UPDATE contact_workflow_steps')) return [];
      if (query.includes('FROM workflow_steps WHERE id ='))
        return [{ id: 'ws1', position: 1, action: STEP_ACTIONS.DELAY }];
      if (query.includes('FROM workflow_steps WHERE workflow_id =')) return []; // No next step
      if (query.includes('FROM workflow_exit_conditions')) return [];
      return [];
    });

    const failedMsg = {
      ...validMsg,
      messageId: '22222222-2222-4222-a222-222222222222',
      contactWorkflowId: 'error-cw', // Triggers the DB Error
    };

    const event = createEvent([validMsg, failedMsg]);

    const result = await handler(event, {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-1');
  });
});
