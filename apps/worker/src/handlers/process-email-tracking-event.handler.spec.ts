import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './process-email-tracking-event.handler';
import type { SqsBatchEvent } from '../infrastructure/queue/sqs-record.parser';
import type { Mocked } from 'vitest';
import type { DataSource } from 'typeorm';
import type { QueueService } from '../infrastructure/queue/queue.interface';
import type { CacheService } from '../infrastructure/cache/cache.interface';
import { EMAIL_TRACKING_EVENTS } from '@email-automation-engine/shared';

vi.mock('../infrastructure', () => ({
  workerConfig: {
    AUTOMATION_EVENTS_QUEUE_URL: 'automation-events',
  },
}));

describe('process-email-tracking-event.handler', () => {
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
    emailMessageId: '44444444-4444-4444-a444-444444444444',
    eventType: EMAIL_TRACKING_EVENTS.OPENED,
    occurredAt: new Date().toISOString(),
  };

  it('inserts tracking event into database and updates stats and emits event', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM email_messages')) {
        return [
          {
            id: 'msg-1',
            tenant_id: 't-1',
            contact_id: 'c-1',
            workflow_id: 'w-1',
            workflow_step_id: 'ws-1',
            contact_workflow_id: 'cw-1',
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
      expect.stringContaining('INSERT INTO email_events'),
      expect.any(Array),
    );
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE email_messages SET first_opened_at'),
      expect.any(Array),
    );
    expect(queueService.sendMessage).toHaveBeenCalledWith(
      'automation-events',
      expect.objectContaining({
        event: `email.${EMAIL_TRACKING_EVENTS.OPENED}`,
        contactId: 'c-1',
      }),
    );
  });

  it('skips when email message is not found', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM email_messages')) return [];
      return [];
    });

    const result = await handler(createEvent([validMsg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(dataSource.query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO email_events'),
      expect.any(Array),
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
      if (query.includes('FROM email_messages'))
        return [
          {
            id: 'msg-1',
            tenant_id: 't-1',
            contact_id: 'c-1',
            workflow_id: 'w-1',
            workflow_step_id: 'ws-1',
            contact_workflow_id: 'cw-1',
          },
        ];
      if (query.includes('INSERT INTO email_events')) {
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
