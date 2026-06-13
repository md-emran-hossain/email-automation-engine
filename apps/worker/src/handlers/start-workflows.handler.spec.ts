import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './start-workflows.handler';
import type { SqsBatchEvent } from '../infrastructure/queue/sqs-record.parser';
import type { Mocked } from 'vitest';
import type { DataSource } from 'typeorm';
import type { QueueService } from '../infrastructure/queue/queue.interface';
import type { CacheService } from '../infrastructure/cache/cache.interface';
import { STEP_ACTIONS } from '@email-automation-engine/shared';

describe('start-workflows.handler', () => {
  let queueService: Mocked<QueueService>;
  let dataSource: Mocked<DataSource>;

  const defaultTenantId = '11111111-1111-4111-a111-111111111111';
  const defaultContactId = '22222222-2222-4222-a222-222222222222';
  const defaultWorkflowId = '33333333-3333-4333-a333-333333333333';
  const defaultStepId = '44444444-4444-4444-a444-444444444444';
  const defaultTriggerId = '55555555-5555-4555-a555-555555555555';
  const defaultContactWorkflowId = '66666666-6666-4666-a666-666666666666';
  const defaultMessageId = '77777777-7777-4777-a777-777777777777';

  beforeEach(() => {
    queueService = {
      sendMessage: vi.fn().mockResolvedValue(undefined),
      sendMessages: vi.fn().mockResolvedValue(undefined),
    };
    dataSource = {
      query: vi.fn(),
      transaction: vi.fn().mockImplementation(async (cb) => {
        return cb(dataSource);
      }),
    } as unknown as Mocked<DataSource>;
  });

  const createEvent = (messages: Record<string, unknown>[]): SqsBatchEvent => ({
    Records: messages.map((message, index) => ({
      messageId: `msg-${index}`,
      receiptHandle: `handle-${index}`,
      body: JSON.stringify(message),
    })),
  });

  const createMsg = (overrides?: Partial<Record<string, unknown>>) => ({
    version: 1,
    messageId: defaultMessageId,
    tenantId: defaultTenantId,
    createdAt: '2024-01-01T00:00:00Z',
    contactId: defaultContactId,
    event: 'contact.subscribed',
    occurredAt: '2024-01-01T00:00:00Z',
    matchedTriggerIds: [defaultTriggerId],
    matchedWorkflowIds: [defaultWorkflowId],
    ...overrides,
  });

  interface QueryMockOptions {
    isActive?: boolean;
    contactExists?: boolean;
    insertReturnsId?: boolean;
    errorAfterCall?: number;
  }

  const setupMockQuery = (options: QueryMockOptions = {}) => {
    const {
      isActive = true,
      contactExists = true,
      insertReturnsId = true,
      errorAfterCall = Infinity,
    } = options;

    let callCount = 0;
    dataSource.query.mockImplementation(async (query: string) => {
      callCount++;
      if (callCount > errorAfterCall) throw new Error('DB Error');

      if (query.includes('FROM workflows')) return [{ id: defaultWorkflowId, is_active: isActive }];
      if (query.includes('FROM contacts')) return contactExists ? [{ id: defaultContactId }] : [];
      if (query.includes('FROM workflow_steps'))
        return [{ id: defaultStepId, action: STEP_ACTIONS.DELAY, workflow_id: defaultWorkflowId }];
      if (query.includes('FROM workflow_triggers'))
        return [{ id: defaultTriggerId, workflow_id: defaultWorkflowId }];
      if (query.includes('SELECT id FROM contact_workflows')) return [];
      if (query.includes('INSERT INTO contact_workflows'))
        return insertReturnsId ? [{ id: defaultContactWorkflowId }] : [];
      return [];
    });
  };

  it('should process a valid message and enqueue a step', async () => {
    setupMockQuery();

    const result = await handler(createEvent([createMsg()]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(queueService.sendMessage).toHaveBeenCalledTimes(1);
    const queuedMsg = queueService.sendMessage.mock.calls[0][1] as {
      contactWorkflowId: string;
      workflowStepId: string;
    };
    expect(queuedMsg.contactWorkflowId).toBe(defaultContactWorkflowId);
    expect(queuedMsg.workflowStepId).toBe(defaultStepId);
  });

  it('should skip inactive workflows', async () => {
    setupMockQuery({ isActive: false });

    const result = await handler(createEvent([createMsg()]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(queueService.sendMessage).not.toHaveBeenCalled();
  });

  it('should skip deleted contacts', async () => {
    setupMockQuery({ contactExists: false });

    const result = await handler(createEvent([createMsg()]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(queueService.sendMessage).not.toHaveBeenCalled();
  });

  it('should be idempotent and not enqueue step if contact_workflow already exists', async () => {
    setupMockQuery({ insertReturnsId: false });

    const result = await handler(createEvent([createMsg()]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(queueService.sendMessage).not.toHaveBeenCalled();
  });

  it('should handle partial batch failure', async () => {
    // 5 queries successfully complete for the first message, 6th query throws for the second message
    setupMockQuery({ errorAfterCall: 5 });

    const validMsg = createMsg({ messageId: '11111111-1111-4111-a111-111111111111' });
    const failedMsg = createMsg({ messageId: '22222222-2222-4222-a222-222222222222' });

    const result = await handler(createEvent([validMsg, failedMsg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(1);
    // The failed item should match the receipt handle or message id mapping.
    // Our createEvent creates records mapped by index: msg-0, msg-1
    expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-1');
  });
});
