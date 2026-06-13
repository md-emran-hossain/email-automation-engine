import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest';
import { AutomationEventService } from './automation-event.service';
import type { TriggerCacheService } from './trigger-cache.service';
import type { ConfigService } from '@nestjs/config';
import type { IQueueService } from '../../../../infrastructure/queue/queue.interface';

describe('AutomationEventService', () => {
  let service: AutomationEventService;
  let triggerCache: { getMatchingTriggers: Mock };
  let queueService: { sendMessage: Mock };
  let configService: { get: Mock };

  beforeEach(() => {
    triggerCache = {
      getMatchingTriggers: vi.fn(),
    };
    queueService = {
      sendMessage: vi.fn(),
    };
    configService = {
      get: vi.fn().mockReturnValue('automation-events'),
    };
    service = new AutomationEventService(
      triggerCache as unknown as TriggerCacheService,
      queueService as unknown as IQueueService,
      configService as unknown as ConfigService,
    );
  });

  it('should return early if no triggers match', async () => {
    triggerCache.getMatchingTriggers.mockResolvedValue([]);
    await service.ingest({
      tenantId: 'tenant-1',
      contactId: 'contact-1',
      event: 'contact.subscribed',
      occurredAt: '2024-01-01T00:00:00Z',
    });
    expect(queueService.sendMessage).not.toHaveBeenCalled();
  });

  it('should enqueue message if triggers match', async () => {
    triggerCache.getMatchingTriggers.mockResolvedValue([
      { id: 'trig1', workflowId: 'workflow-1' },
      { id: 'trig2', workflowId: 'workflow-1' },
    ]);
    await service.ingest({
      tenantId: 'tenant-1',
      contactId: 'contact-1',
      event: 'contact.subscribed',
      occurredAt: '2024-01-01T00:00:00Z',
    });
    expect(queueService.sendMessage).toHaveBeenCalledTimes(1);
    const message = queueService.sendMessage.mock.calls[0][1];
    expect(message.matchedTriggerIds).toEqual(['trig1', 'trig2']);
    expect(message.matchedWorkflowIds).toEqual(['workflow-1']);
  });
});
