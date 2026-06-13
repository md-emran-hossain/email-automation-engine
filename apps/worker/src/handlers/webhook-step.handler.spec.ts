import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './webhook-step.handler';
import type { SqsBatchEvent } from '../infrastructure/queue/sqs-record.parser';
import type { Mocked } from 'vitest';
import type { DataSource } from 'typeorm';
import type { QueueService } from '../infrastructure/queue/queue.interface';
import type { CacheService } from '../infrastructure/cache/cache.interface';
import { STEP_ACTIONS } from '@email-automation-engine/shared';

vi.mock('../infrastructure', () => ({
  workerConfig: {
    WEBHOOK_DELIVERIES_QUEUE_URL: 'webhook-deliveries-queue',
    FINISHED_STEPS_QUEUE_URL: 'finished-steps-queue',
  },
}));

describe('webhook-step.handler', () => {
  let queueService: Mocked<QueueService>;
  let dataSource: Mocked<DataSource>;

  beforeEach(() => {
    vi.clearAllMocks();
    queueService = {
      sendMessage: vi.fn().mockResolvedValue(undefined),
      sendMessages: vi.fn().mockResolvedValue(undefined),
    };
    dataSource = {
      query: vi.fn(),
      transaction: vi.fn(),
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
    messageId: '11111111-1111-4111-a111-111111111111',
    tenantId: '22222222-2222-4222-a222-222222222222',
    createdAt: new Date().toISOString(),
    contactId: '33333333-3333-4333-a333-333333333333',
    contactWorkflowId: '44444444-4444-4444-a444-444444444444',
    workflowId: '55555555-5555-4555-a555-555555555555',
    workflowStepId: '66666666-6666-4666-a666-666666666666',
    contactWorkflowStepId: '77777777-7777-4777-a777-777777777777',
    action: STEP_ACTIONS.WEBHOOK,
  };

  it('enqueues delivery message and finish message immediately', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM workflow_steps')) {
        return [
          {
            config: {
              url: 'https://test.com',
              method: 'PUT',
              headers: { Auth: '123' },
              body: 'hello',
            },
          },
        ];
      }
      return [];
    });

    const result = await handler(createEvent([validMsg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO webhook_deliveries'),
      expect.arrayContaining(['https://test.com']),
    );
    expect(queueService.sendMessage).toHaveBeenCalledWith(
      'webhook-deliveries-queue',
      expect.objectContaining({
        url: 'https://test.com',
        method: 'PUT',
        headers: { Auth: '123' },
        body: 'hello',
        deliveryId: expect.any(String),
      }),
    );
    expect(queueService.sendMessage).toHaveBeenCalledWith(
      'finished-steps-queue',
      expect.objectContaining({
        contactWorkflowStepId: validMsg.contactWorkflowStepId,
      }),
    );
  });

  it('handles malformed message by returning batchItemFailure', async () => {
    const result = await handler(createEvent([{ bad: 'data' }]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });
    expect(result.batchItemFailures).toHaveLength(1);
  });

  it('handles partial batch failure', async () => {
    let callCount = 0;
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('workflow_steps')) {
        if (callCount++ === 1) throw new Error('DB Error');
        return [
          {
            config: {
              url: 'https://test.com',
              method: 'PUT',
              headers: { Auth: '123' },
              body: 'hello',
            },
          },
        ];
      }
      return [];
    });

    const result = await handler(createEvent([validMsg, { ...validMsg, messageId: 'msg-2' }]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-1');
  });
});
