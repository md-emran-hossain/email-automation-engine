import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './call-webhook.handler';
import type { SqsBatchEvent } from '../infrastructure/queue/sqs-record.parser';
import type { Mocked } from 'vitest';
import type { DataSource } from 'typeorm';
import type { QueueService } from '../infrastructure/queue/queue.interface';
import type { CacheService } from '../infrastructure/cache/cache.interface';

vi.mock('../infrastructure', () => ({
  workerConfig: {
    FINISHED_STEPS_QUEUE_URL: 'finished-steps-queue',
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('call-webhook.handler', () => {
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
    deliveryId: '88888888-8888-4888-a888-888888888888',
    url: 'https://example.com',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"test":"true"}',
  };

  it('performs HTTP request and updates webhook_deliveries', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: vi.fn().mockResolvedValueOnce('OK'),
    });

    const result = await handler(createEvent([validMsg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        method: 'POST',
        body: '{"test":"true"}',
      }),
    );
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE webhook_deliveries'),
      expect.arrayContaining([200, 'OK', 'completed']),
    );
    expect(queueService.sendMessage).not.toHaveBeenCalledWith(
      'finished-steps-queue',
      expect.any(Object),
    );
  });

  it('handles fetch failure correctly (HTTP error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await handler(createEvent([validMsg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(1);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE webhook_deliveries'),
      expect.arrayContaining([500, 'Network error', 'failed']),
    );
    expect(queueService.sendMessage).not.toHaveBeenCalledWith(
      'finished-steps-queue',
      expect.any(Object),
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
    mockFetch.mockResolvedValueOnce({ status: 200, text: vi.fn().mockResolvedValue('OK') });
    dataSource.query.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('DB Error'));

    const result = await handler(createEvent([validMsg, { ...validMsg, messageId: 'msg-2' }]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-1');
  });
});
