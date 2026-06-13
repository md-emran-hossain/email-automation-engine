import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './send-workflow-email.handler';
import type { SqsBatchEvent } from '../infrastructure/queue/sqs-record.parser';
import type { Mocked } from 'vitest';
import type { DataSource } from 'typeorm';
import type { QueueService } from '../infrastructure/queue/queue.interface';
import type { CacheService } from '../infrastructure/cache/cache.interface';
import { STEP_ACTIONS } from '@email-automation-engine/shared';

const mockSend = vi.fn();
vi.mock('@aws-sdk/client-ses', () => {
  const SESClient = class {
    send = mockSend;
  };
  return {
    SESClient,
    SendEmailCommand: vi.fn(),
  };
});

vi.mock('../infrastructure', () => ({
  workerConfig: {
    AWS_REGION: 'us-east-1',
    FROM_EMAIL_ADDRESS: 'test@example.com',
    FINISHED_STEPS_QUEUE_URL: 'finished-steps-queue',
    AUTOMATION_EVENTS_QUEUE_URL: 'automation-events-queue',
  },
}));

describe('send-workflow-email.handler', () => {
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
    action: STEP_ACTIONS.SEND_EMAIL,
  };

  it('should process a valid message and send email', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM email_messages')) return []; // Not already sent
      if (query.includes('FROM contacts'))
        return [{ email: 'user@test.com', subscribed: true, deleted_at: null }];
      return [];
    });
    mockSend.mockResolvedValueOnce({ MessageId: 'ses-123' });

    const result = await handler(createEvent([validMsg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO email_messages'),
      expect.any(Array),
    );
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE email_messages SET status = 'sent'"),
      expect.arrayContaining(['ses-123']),
    );
    expect(queueService.sendMessage).toHaveBeenCalledWith(
      'finished-steps-queue',
      expect.objectContaining({
        contactWorkflowStepId: validMsg.contactWorkflowStepId,
      }),
    );
  });

  it('loads step config and template correctly', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM email_messages')) return [];
      if (query.includes('FROM contacts'))
        return [{ email: 'user@test.com', subscribed: true, deleted_at: null }];
      if (query.includes('FROM workflow_steps')) return [{ config: { templateId: 'tpl-1' } }];
      if (query.includes('FROM email_templates'))
        return [{ subject: 'Custom Subject', html: '<p>HTML!</p>', text: null }];
      return [];
    });
    mockSend.mockResolvedValueOnce({ MessageId: 'ses-123' });

    const result = await handler(createEvent([validMsg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT subject, html, text FROM email_templates'),
      expect.arrayContaining(['tpl-1']),
    );

    // Check that SES was called with the custom subject and HTML body
    expect(mockSend).toHaveBeenCalledTimes(1);

    // We can't directly inspect SendEmailCommand easily without spying on its constructor or SESClient send args,
    // but the query to save email_messages has the subject
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO email_messages'),
      expect.arrayContaining(['tpl-1', 'Custom Subject']),
    );
  });

  it('does NOT send SES email when contact is unsubscribed', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM email_messages')) return [];
      if (query.includes('FROM contacts'))
        return [{ email: 'user@test.com', subscribed: false, deleted_at: null }];
      return [];
    });

    const result = await handler(createEvent([validMsg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(mockSend).not.toHaveBeenCalled();
    expect(queueService.sendMessage).not.toHaveBeenCalled();
  });

  it('does NOT send duplicate SES email on replay if status is sent', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM email_messages')) return [{ id: 'existing-msg', status: 'sent' }];
      return [];
    });

    const result = await handler(createEvent([validMsg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    expect(mockSend).not.toHaveBeenCalled();
    expect(queueService.sendMessage).not.toHaveBeenCalled();
  });

  it('retries sending if previous status was failed', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM email_messages')) return [{ id: 'existing-msg', status: 'failed' }];
      if (query.includes('FROM contacts'))
        return [{ email: 'user@test.com', subscribed: true, deleted_at: null }];
      return [];
    });
    mockSend.mockResolvedValueOnce({ MessageId: 'ses-123' });

    const result = await handler(createEvent([validMsg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(0);
    // Should update existing record to 'sending'
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE email_messages SET status = 'sending'"),
      expect.arrayContaining(['existing-msg']),
    );
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('handles malformed message by returning batchItemFailure', async () => {
    const result = await handler(createEvent([{ bad: 'data' }]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });
    expect(result.batchItemFailures).toHaveLength(1);
  });

  it('handles SES send failure and returns batchItemFailure', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM email_messages')) return [];
      if (query.includes('FROM contacts'))
        return [{ email: 'user@test.com', subscribed: true, deleted_at: null }];
      return [];
    });
    mockSend.mockRejectedValueOnce(new Error('SES Error'));

    const result = await handler(createEvent([validMsg]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-0');
  });

  it('handles partial batch failure', async () => {
    dataSource.query.mockImplementation(async (query: string) => {
      if (query.includes('FROM email_messages')) return [];
      if (query.includes('FROM contacts'))
        return [{ email: 'user@test.com', subscribed: true, deleted_at: null }];
      return [];
    });
    mockSend
      .mockResolvedValueOnce({ MessageId: 'ses-123' })
      .mockRejectedValueOnce(new Error('SES Error'));

    const result = await handler(createEvent([validMsg, { ...validMsg, messageId: 'msg-2' }]), {
      queueService,
      cacheService: {} as CacheService,
      dataSource,
    });

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-1');
  });
});
