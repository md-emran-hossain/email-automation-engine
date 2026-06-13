import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './conditional-split.handler';
import type { SqsBatchEvent } from '../infrastructure/queue/sqs-record.parser';
import type { Mocked } from 'vitest';
import { CONDITION_TYPES, STEP_ACTIONS } from '@email-automation-engine/shared';
import type { DataSource } from 'typeorm';
import type { QueueService } from '../infrastructure/queue/queue.interface';
import type { CacheService } from '../infrastructure/cache/cache.interface';

vi.mock('../infrastructure', () => ({
  workerConfig: {
    FINISHED_STEPS_QUEUE_URL: 'finished-steps-queue',
  },
}));

describe('conditional-split.handler', () => {
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
    action: STEP_ACTIONS.CONDITIONAL_SPLIT,
  };

  it('routes to true branch when condition evaluates true', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('workflow_step_conditions')) {
        return [{ type: CONDITION_TYPES.TAG_HAS, resource: 'tag-1', logical_operator: 'ALL' }];
      }
      if (query.includes('contacts WHERE id')) {
        return [{ metadata: {} }];
      }
      if (query.includes('contact_tags')) {
        return [{ 1: 1 }]; // simulates found
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
      expect.stringContaining('SELECT * FROM workflow_step_conditions'),
      expect.any(Array),
    );
    expect(queueService.sendMessage).toHaveBeenCalledWith(
      'finished-steps-queue',
      expect.objectContaining({
        contactWorkflowStepId: validMsg.contactWorkflowStepId,
        conditionalSplitResult: true,
      }),
    );
  });

  it('routes to false branch when condition evaluates false', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('workflow_step_conditions')) {
        return [{ type: CONDITION_TYPES.TAG_HAS, resource: 'tag-1', logical_operator: 'ALL' }];
      }
      if (query.includes('contacts WHERE id')) {
        return [{ metadata: {} }];
      }
      if (query.includes('contact_tags')) {
        return []; // simulates not found
      }
      return [];
    });

    const result = await handler(createEvent([validMsg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(queueService.sendMessage).toHaveBeenCalledWith(
      'finished-steps-queue',
      expect.objectContaining({
        conditionalSplitResult: false,
      }),
    );
  });

  it('defaults to true when no conditions exist', async () => {
    dataSource.query.mockImplementation(async () => {
      return [];
    });

    const result = await handler(createEvent([validMsg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(queueService.sendMessage).toHaveBeenCalledWith(
      'finished-steps-queue',
      expect.objectContaining({
        conditionalSplitResult: true,
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
      if (query.includes('workflow_step_conditions')) {
        if (callCount++ === 1) throw new Error('DB Error');
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
