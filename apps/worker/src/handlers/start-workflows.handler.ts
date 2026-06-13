import type { SqsBatchEvent, SqsBatchResponse } from '../infrastructure/queue/sqs-record.parser';
import { parseSqsRecords } from '../infrastructure/queue/sqs-record.parser';
import { isAutomationEventMessage } from '@email-automation-engine/shared';
import type { AutomationEventMessage } from '@email-automation-engine/shared';
import type { QueueService } from '../infrastructure/queue/queue.interface';
import type { CacheService } from '../infrastructure/cache/cache.interface';
import type { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { v7 as uuidv7 } from 'uuid';
import { Logger } from '../infrastructure/logger/logger';
import { workerConfig } from '../infrastructure';

export interface WorkerDeps {
  queueService: QueueService;
  cacheService: CacheService;
  dataSource: DataSource;
}

export async function handler(event: SqsBatchEvent, deps: WorkerDeps): Promise<SqsBatchResponse> {
  const { queueService, dataSource } = deps;
  const { records: validRecords, failures } = parseSqsRecords<AutomationEventMessage>(
    event,
    isAutomationEventMessage,
  );

  const batchItemFailures = [...failures.batchItemFailures];

  for (const record of validRecords) {
    const message = record.message;

    try {
      await dataSource.transaction(async (manager) => {
        // 1. Lock the contact row once per message to prevent deduplication race conditions
        const contacts = await manager.query<Array<{ id: string }>>(
          `SELECT id FROM contacts WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE`,
          [message.contactId, message.tenantId],
        );
        if (contacts.length === 0) {
          return; // Skip if contact is missing or deleted
        }

        // 2. Fetch all matching workflows in one go to check if they are active
        const workflows = await manager.query<Array<{ id: string; is_active: boolean }>>(
          `SELECT id, is_active FROM workflows WHERE id = ANY($1) AND tenant_id = $2`,
          [message.matchedWorkflowIds, message.tenantId],
        );
        const activeWorkflowIds = workflows.filter((w) => w.is_active).map((w) => w.id);
        if (activeWorkflowIds.length === 0) {
          return; // Skip if no active workflows
        }

        // 3. Fetch root steps for all active workflows in one go
        const steps = await manager.query<
          Array<{ id: string; action: string; workflow_id: string }>
        >(
          `SELECT id, action, workflow_id FROM workflow_steps WHERE workflow_id = ANY($1) AND parent_workflow_step_id IS NULL`,
          [activeWorkflowIds],
        );

        // 4. Fetch triggers for all active workflows in one go
        let triggers: Array<{ id: string; workflow_id: string }> = [];
        if (message.matchedTriggerIds.length > 0) {
          const triggerIdsList = message.matchedTriggerIds.map((_, i) => `$${i + 3}`).join(', ');
          triggers = await manager.query<Array<{ id: string; workflow_id: string }>>(
            `SELECT id, workflow_id FROM workflow_triggers WHERE id IN (${triggerIdsList}) AND workflow_id = ANY($1) AND tenant_id = $2`,
            [activeWorkflowIds, message.tenantId, ...message.matchedTriggerIds],
          );
        }

        // 5. Process each active workflow in memory using the batched data
        for (const workflowId of activeWorkflowIds) {
          const rootStep = steps.find((s) => s.workflow_id === workflowId);
          if (!rootStep) {
            continue; // Malformed workflow (no root step)
          }

          const trigger = triggers.find((t) => t.workflow_id === workflowId);
          const triggerId = trigger ? trigger.id : null;

          // Insert contact_workflows with dedup check using CTE
          const newContactWorkflowId = uuidv7();
          const insertRes = await manager.query<Array<{ id: string }>>(
            `INSERT INTO contact_workflows (id, tenant_id, workflow_id, workflow_trigger_id, contact_id, status, trigger_event, created_at, updated_at)
             SELECT $1, $2, $3, $4, $5, 'pending', $6, now(), now()
             WHERE NOT EXISTS (
               SELECT 1 FROM contact_workflows 
               WHERE contact_id = $5 AND workflow_id = $3 AND status NOT IN ('finished', 'error')
             )
             RETURNING id`,
            [
              newContactWorkflowId,
              message.tenantId,
              workflowId,
              triggerId,
              message.contactId,
              message.event,
            ],
          );

          if (insertRes.length === 0 || !insertRes[0]) {
            continue; // Dedup check triggered
          }
          const contactWorkflowId = insertRes[0].id;

          // Enqueue to waiting-contact-workflow-steps
          const waitingUrl = workerConfig.WAITING_STEPS_QUEUE_URL;
          await queueService.sendMessage(waitingUrl, {
            version: 1,
            messageId: randomUUID(),
            tenantId: message.tenantId,
            createdAt: new Date().toISOString(),
            contactId: message.contactId,
            contactWorkflowId,
            workflowId,
            workflowStepId: rootStep.id,
            action: rootStep.action,
          });
        }
      });
    } catch (error) {
      Logger.error(`Failed to process start-workflow for record ${record.messageId}`, error);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
}
