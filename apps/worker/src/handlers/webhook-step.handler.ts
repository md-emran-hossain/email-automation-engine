import type { SqsBatchEvent, SqsBatchResponse } from '../infrastructure/queue/sqs-record.parser';
import { parseSqsRecords } from '../infrastructure/queue/sqs-record.parser';
import {
  isWebhookStepMessage,
  STEP_ACTIONS,
  WEBHOOK_DELIVERY_STATUS,
} from '@email-automation-engine/shared';
import type { WebhookStepMessage } from '@email-automation-engine/shared';
import type { WorkerDeps } from './start-workflows.handler';
import { Logger } from '../infrastructure/logger/logger';
import { v7 as uuidv7 } from 'uuid';
import { workerConfig } from '../infrastructure';

export async function handler(event: SqsBatchEvent, deps: WorkerDeps): Promise<SqsBatchResponse> {
  const { records: validRecords, failures } = parseSqsRecords<WebhookStepMessage>(
    event,
    isWebhookStepMessage,
  );

  await Promise.all(
    validRecords.map(async (record) => {
      try {
        await processWebhookStep(record.message, deps);
      } catch (error) {
        Logger.error(
          `Error processing message ${record.messageId}:`,
          error instanceof Error ? error : new Error(String(error)),
        );
        failures.batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }),
  );

  return failures;
}

async function processWebhookStep(message: WebhookStepMessage, deps: WorkerDeps): Promise<void> {
  const { queueService, dataSource } = deps;
  Logger.info(`Processing webhook step: ${message.contactWorkflowStepId}`);

  // 1. Fetch webhook config
  const stepQuery = await dataSource.query<Array<{ config: Record<string, unknown> }>>(
    `SELECT config FROM workflow_steps WHERE id = $1 AND tenant_id = $2`,
    [message.workflowStepId, message.tenantId],
  );
  const stepConfig = stepQuery[0]?.config || {};

  const targetUrl = typeof stepConfig.url === 'string' ? stepConfig.url : '';

  if (!targetUrl) {
    Logger.warn(
      `Webhook URL missing for step ${message.contactWorkflowStepId}. Skipping delivery.`,
    );

    await queueService.sendMessage(workerConfig.FINISHED_STEPS_QUEUE_URL, {
      version: 1,
      messageId: crypto.randomUUID(),
      tenantId: message.tenantId,
      createdAt: new Date().toISOString(),
      contactId: message.contactId,
      contactWorkflowId: message.contactWorkflowId,
      contactWorkflowStepId: message.contactWorkflowStepId,
      workflowId: message.workflowId,
      workflowStepId: message.workflowStepId,
      action: STEP_ACTIONS.WEBHOOK,
    });
    return;
  }

  const method = typeof stepConfig.method === 'string' ? stepConfig.method : 'POST';
  const headers =
    typeof stepConfig.headers === 'object' && stepConfig.headers !== null
      ? (stepConfig.headers as Record<string, string>)
      : {};
  const body =
    typeof stepConfig.body === 'string' || typeof stepConfig.body === 'object'
      ? stepConfig.body
      : JSON.stringify({ event: 'workflow_trigger', contactId: message.contactId });

  // 2. Insert WebhookDelivery record
  const deliveryId = uuidv7();
  await dataSource.query(
    `INSERT INTO webhook_deliveries (id, tenant_id, contact_workflow_step_id, url, method, request_headers, request_body, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      deliveryId,
      message.tenantId,
      message.contactWorkflowStepId,
      targetUrl,
      method,
      headers,
      typeof body === 'string' ? body : JSON.stringify(body),
      WEBHOOK_DELIVERY_STATUS.PENDING,
    ],
  );

  // 3. Enqueue WebhookDeliveryMessage
  await queueService.sendMessage(workerConfig.WEBHOOK_DELIVERIES_QUEUE_URL, {
    version: 1,
    messageId: crypto.randomUUID(),
    tenantId: message.tenantId,
    createdAt: new Date().toISOString(),
    contactId: message.contactId,
    contactWorkflowId: message.contactWorkflowId,
    contactWorkflowStepId: message.contactWorkflowStepId,
    workflowId: message.workflowId,
    workflowStepId: message.workflowStepId,
    deliveryId: deliveryId,
    url: targetUrl,
    method: method,
    headers: headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

  // 4. Enqueue FinishedStepMessage immediately
  await queueService.sendMessage(workerConfig.FINISHED_STEPS_QUEUE_URL, {
    version: 1,
    messageId: crypto.randomUUID(),
    tenantId: message.tenantId,
    createdAt: new Date().toISOString(),
    contactId: message.contactId,
    contactWorkflowId: message.contactWorkflowId,
    contactWorkflowStepId: message.contactWorkflowStepId,
    workflowId: message.workflowId,
    workflowStepId: message.workflowStepId,
    action: STEP_ACTIONS.WEBHOOK,
  });

  Logger.info(`Scheduled webhook delivery for step ${message.contactWorkflowStepId}`);
}
