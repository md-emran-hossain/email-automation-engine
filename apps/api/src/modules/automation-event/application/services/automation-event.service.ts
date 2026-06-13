import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v7 as uuidv7 } from 'uuid';
import { AutomationEventDto, AutomationEventMessage } from '@email-automation-engine/shared';
import { QUEUE_SERVICE, IQueueService } from '../../../../infrastructure/queue/queue.interface';
import { TriggerCacheService } from './trigger-cache.service';
import { AUTOMATION_EVENTS_QUEUE_URL } from '../../../../infrastructure/config/config-keys';

@Injectable()
export class AutomationEventService {
  private readonly logger = new Logger(AutomationEventService.name);
  private readonly queueUrl: string;

  constructor(
    private readonly triggerCache: TriggerCacheService,
    @Inject(QUEUE_SERVICE)
    private readonly queueService: IQueueService,
    private readonly configService: ConfigService,
  ) {
    this.queueUrl = this.configService.get<string>(AUTOMATION_EVENTS_QUEUE_URL)!;
  }

  async ingest(dto: AutomationEventDto): Promise<void> {
    const triggers = await this.triggerCache.getMatchingTriggers(dto.tenantId, dto.event);

    if (!triggers || triggers.length === 0) {
      return;
    }

    const matchedTriggerIds = triggers.map((trigger) => trigger.id);
    const matchedWorkflowIds = Array.from(new Set(triggers.map((trigger) => trigger.workflowId)));

    const message: AutomationEventMessage = {
      version: 1,
      messageId: uuidv7(),
      tenantId: dto.tenantId,
      createdAt: new Date().toISOString(),
      contactId: dto.contactId,
      event: dto.event,
      metadata: dto.metadata,
      occurredAt: dto.occurredAt,
      matchedTriggerIds,
      matchedWorkflowIds,
    };

    await this.queueService.sendMessage(this.queueUrl, message);
  }
}
