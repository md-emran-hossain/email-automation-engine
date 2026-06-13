import type { QueueService } from '../infrastructure/queue/queue.interface';
import type { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { Logger } from '../infrastructure/logger/logger';
import { workerConfig } from '../infrastructure';

export interface SchedulerDeps {
  queueService: QueueService;
  dataSource: DataSource;
}

export async function handler(event: unknown, deps: SchedulerDeps): Promise<void> {
  const { dataSource } = deps;

  const dueSteps = await dataSource.query<
    Array<{
      contact_workflow_step_id: string;
      tenant_id: string;
      contact_workflow_id: string;
      workflow_step_id: string;
      contact_id: string;
      workflow_id: string;
      action: string;
    }>
  >(`
    SELECT
      cws.id as contact_workflow_step_id,
      cws.tenant_id,
      cws.contact_workflow_id,
      cws.workflow_step_id,
      cw.contact_id,
      cw.workflow_id,
      ws.action
    FROM contact_workflow_steps cws
    INNER JOIN contact_workflows cw ON cw.id = cws.contact_workflow_id
    INNER JOIN workflow_steps ws ON ws.id = cws.workflow_step_id
    WHERE cws.status = 'scheduled' AND cws.scheduled_at <= now()
    LIMIT 1000
  `);

  await Promise.all(
    dueSteps.map(async (step) => {
      try {
        await processScheduledStep(step, deps);
      } catch (error) {
        Logger.error(`Failed to process scheduled step ${step.contact_workflow_step_id}`, error);
      }
    }),
  );
}

async function processScheduledStep(
  step: {
    contact_workflow_step_id: string;
    tenant_id: string;
    contact_workflow_id: string;
    workflow_step_id: string;
    contact_id: string;
    workflow_id: string;
    action: string;
  },
  deps: SchedulerDeps,
): Promise<void> {
  const { queueService, dataSource } = deps;
  const waitingUrl = workerConfig.WAITING_STEPS_QUEUE_URL;
  const updateRes = await dataSource.query<Array<{ id: string }>>(
    `UPDATE contact_workflow_steps SET status = 'pending', updated_at = now() WHERE id = $1 AND status = 'scheduled' RETURNING id`,
    [step.contact_workflow_step_id],
  );

  // If no rows were updated, another worker might have picked it up
  if (updateRes.length === 0) return;

  await queueService.sendMessage(waitingUrl, {
    version: 1,
    messageId: randomUUID(),
    tenantId: step.tenant_id,
    createdAt: new Date().toISOString(),
    contactId: step.contact_id,
    contactWorkflowId: step.contact_workflow_id,
    contactWorkflowStepId: step.contact_workflow_step_id,
    workflowId: step.workflow_id,
    workflowStepId: step.workflow_step_id,
    action: step.action,
  });
}
