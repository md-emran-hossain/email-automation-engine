import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest';
import { AutomationEventController } from './automation-event.controller';
import type { AutomationEventService } from '../../../application/services/automation-event.service';

describe('AutomationEventController', () => {
  let controller: AutomationEventController;
  let service: { ingest: Mock };

  beforeEach(() => {
    service = {
      ingest: vi.fn(),
    };
    controller = new AutomationEventController(service as unknown as AutomationEventService);
  });

  it('should call ingest and return accepted', async () => {
    const dto = {
      tenantId: 'tenant-1',
      contactId: 'contact-1',
      event: 'contact.subscribed' as const,
      occurredAt: '2024-01-01T00:00:00Z',
    };
    const result = await controller.ingestEvent(dto);
    expect(service.ingest).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ accepted: true });
  });
});
