import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './start-workflow-steps.handler';
import type { SqsBatchEvent } from '../infrastructure/queue/sqs-record.parser';
import type { Mocked } from 'vitest';
import type { DataSource } from 'typeorm';
import type { QueueService } from '../infrastructure/queue/queue.interface';
import type { CacheService } from '../infrastructure/cache/cache.interface';
import { STEP_ACTIONS } from '@email-automation-engine/shared';

describe('start-workflow-steps.handler', () => {
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
    action: STEP_ACTIONS.DELAY,
  };

  it('should process a delay step', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM contact_workflows'))
        return [{ id: 'contact-workflow-1', status: 'pending' }];
      if (query.includes('INSERT INTO contact_workflow_steps')) return [{ id: 'step1' }];
      if (query.includes('FROM workflow_steps')) return [{ config: { amount: 2, unit: 'days' } }];
      return [];
    });

    const msg = { ...validMsg };

    const result = await handler(createEvent([msg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(queueService.sendMessage).not.toHaveBeenCalled(); // delays don't enqueue finish
  });

  it('should process a simple action and enqueue finish', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM contact_workflows'))
        return [{ id: 'contact-workflow-1', status: 'in_progress' }];
      if (query.includes('INSERT INTO contact_workflow_steps')) return [{ id: 'step1' }];
      if (query.includes('FROM workflow_steps')) return [{ config: { tagId: 'tag1' } }];
      return [];
    });

    const msg = { ...validMsg, action: STEP_ACTIONS.ATTACH_TAG };

    const result = await handler(createEvent([msg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(queueService.sendMessage).toHaveBeenCalledTimes(1);
    const queuedMsg = queueService.sendMessage.mock.calls[0][1] as { action: string };
    expect(queuedMsg.action).toBe(STEP_ACTIONS.ATTACH_TAG);
  });

  it('should route send_email to workflow-emails.fifo', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM contact_workflows'))
        return [{ id: 'contact-workflow-1', status: 'in_progress' }];
      if (query.includes('INSERT INTO contact_workflow_steps')) return [{ id: 'step1' }];
      if (query.includes('FROM workflow_steps')) return [{ config: {} }];
      return [];
    });

    const msg = { ...validMsg, action: STEP_ACTIONS.SEND_EMAIL };

    const result = await handler(createEvent([msg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(queueService.sendMessage).toHaveBeenCalledTimes(1);
    expect(queueService.sendMessage.mock.calls[0][0]).toContain('workflow-emails.fifo');
  });

  it('should handle malformed messages by returning batchItemFailures', async () => {
    // missing required fields
    const msg = {
      version: 1,
      messageId: '77777777-7777-4777-a777-777777777777',
      // missing tenantId, contactId, etc.
    };

    const result = await handler(createEvent([msg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-0');
  });

  it('should skip if workflow is already finished', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM contact_workflows'))
        return [{ id: 'contact-workflow-1', status: 'finished' }];
      return [];
    });

    const msg = { ...validMsg };

    const result = await handler(createEvent([msg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0); // Safely skipped
    expect(dataSource.query).toHaveBeenCalledTimes(1); // Only checked status
  });
});
