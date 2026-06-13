import type { SqsBatchEvent, SqsBatchResponse } from '../infrastructure/queue/sqs-record.parser';
import { parseSqsRecords } from '../infrastructure/queue/sqs-record.parser';
import {
  isConditionalSplitMessage,
  LOGICAL_OPERATORS,
  CONDITION_TYPES,
  CONDITION_OPERATORS,
  STEP_ACTIONS,
} from '@email-automation-engine/shared';
import type { ConditionalSplitMessage } from '@email-automation-engine/shared';
import type { WorkerDeps } from './start-workflows.handler';
import { Logger } from '../infrastructure/logger/logger';
import { workerConfig } from '../infrastructure';

export async function handler(event: SqsBatchEvent, deps: WorkerDeps): Promise<SqsBatchResponse> {
  const { records: validRecords, failures } = parseSqsRecords<ConditionalSplitMessage>(
    event,
    isConditionalSplitMessage,
  );

  await Promise.all(
    validRecords.map(async (record) => {
      try {
        await processConditionalSplit(record.message, deps);
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

async function processConditionalSplit(
  message: ConditionalSplitMessage,
  deps: WorkerDeps,
): Promise<void> {
  const { queueService, dataSource } = deps;
  Logger.info(`Processing conditional split for step: ${message.contactWorkflowStepId}`);

  // 1. Load conditions from `workflow_step_conditions`
  const conditions = await dataSource.query<
    Array<{
      logical_operator: string;
      type: string;
      resource: string;
      operator: string;
      value: string;
    }>
  >(`SELECT * FROM workflow_step_conditions WHERE workflow_step_id = $1`, [message.workflowStepId]);

  let result = true;

  if (Array.isArray(conditions) && conditions.length > 0) {
    const contactResult = await dataSource.query<Array<{ metadata: Record<string, unknown> }>>(
      `SELECT metadata FROM contacts WHERE id = $1`,
      [message.contactId],
    );
    const metadata = contactResult[0]?.metadata || {};

    const evaluations = await Promise.all(
      conditions.map((condition) => evaluateCondition(condition, message, metadata, dataSource)),
    );

    const logicalOp = conditions[0]?.logical_operator || LOGICAL_OPERATORS.ALL;
    switch (logicalOp) {
      case LOGICAL_OPERATORS.ANY:
        result = evaluations.some((r) => r);
        break;
      case LOGICAL_OPERATORS.NONE:
        result = !evaluations.some((r) => r);
        break;
      case LOGICAL_OPERATORS.ALL:
      default:
        result = evaluations.every((r) => r);
        break;
    }
  }

  // 2. Send FinishedStepMessage to FINISHED_STEPS_QUEUE_URL
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
    action: STEP_ACTIONS.CONDITIONAL_SPLIT,
    conditionalSplitResult: result,
  });

  Logger.info(
    `Completed conditional split for step ${message.contactWorkflowStepId} with result ${result}`,
  );
}

async function evaluateCondition(
  condition: { type: string; resource: string; operator: string; value: string },
  message: ConditionalSplitMessage,
  metadata: Record<string, unknown>,
  dataSource: WorkerDeps['dataSource'],
): Promise<boolean> {
  switch (condition.type) {
    case CONDITION_TYPES.TAG_HAS: {
      const countResult = await dataSource.query<Array<{ '?column?': number }>>(
        `SELECT 1 FROM contact_tags WHERE contact_id = $1 AND tag_id = $2`,
        [message.contactId, condition.resource],
      );
      return countResult.length > 0;
    }
    case CONDITION_TYPES.TAG_MISSING: {
      const countResult = await dataSource.query<Array<{ '?column?': number }>>(
        `SELECT 1 FROM contact_tags WHERE contact_id = $1 AND tag_id = $2`,
        [message.contactId, condition.resource],
      );
      return countResult.length === 0;
    }
    case CONDITION_TYPES.CONTACT_FIELD: {
      const rawValue = metadata[condition.resource];
      const fieldValue = typeof rawValue === 'string' ? rawValue : '';
      if (condition.operator === CONDITION_OPERATORS.EQUALS)
        return String(fieldValue) === String(condition.value);
      if (condition.operator === CONDITION_OPERATORS.NOT_EQUALS)
        return String(fieldValue) !== String(condition.value);
      if (condition.operator === CONDITION_OPERATORS.CONTAINS)
        return String(fieldValue).includes(String(condition.value));
      return false;
    }
    case CONDITION_TYPES.EMAIL_OPENED: {
      const emailCount = await dataSource.query<Array<{ '?column?': number }>>(
        `SELECT 1 FROM email_events WHERE contact_id = $1 AND event = 'opened'`,
        [message.contactId],
      );
      return emailCount.length > 0;
    }
    case CONDITION_TYPES.EMAIL_CLICKED: {
      const clickCount = await dataSource.query<Array<{ '?column?': number }>>(
        `SELECT 1 FROM email_events WHERE contact_id = $1 AND event = 'clicked'`,
        [message.contactId],
      );
      return clickCount.length > 0;
    }
    default:
      return false;
  }
}
