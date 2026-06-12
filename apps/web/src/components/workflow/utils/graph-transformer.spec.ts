import { describe, it, expect } from 'vitest';
import { generateWorkflowGraph } from './graph-transformer';
import {
  type WorkflowStepResponse,
  type WorkflowTriggerResponse,
} from '@email-automation-engine/shared';

describe('graph-transformer', () => {
  it('should transform a simple workflow with trigger and no steps', () => {
    const trigger: WorkflowTriggerResponse = {
      id: 'trigger-1',
      tenantId: 'tenant-1',
      workflowId: 'wf-1',
      event: 'contact_created',
      filters: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = generateWorkflowGraph(
      [trigger],
      [],
      false,
      () => {},
      () => {},
    );

    expect(result.nodes).toHaveLength(4);
    expect(result.edges).toHaveLength(2);

    const triggerNode = result.nodes[0];
    expect(triggerNode).toBeDefined();
    expect(triggerNode!.id).toBe('trigger-trigger-1');
    expect(triggerNode!.type).toBe('triggerNode');
  });

  it('should transform a linear workflow with trigger and steps', () => {
    const trigger: WorkflowTriggerResponse = {
      id: 'trigger-1',
      tenantId: 'tenant-1',
      workflowId: 'wf-1',
      event: 'contact_created',
      filters: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const steps: WorkflowStepResponse[] = [
      {
        id: 'step-1',
        tenantId: 'tenant-1',
        workflowId: 'wf-1',
        parentWorkflowStepId: null,
        action: 'delay',
        position: 0,
        config: { amount: 1, unit: 'days' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'step-2',
        tenantId: 'tenant-1',
        workflowId: 'wf-1',
        parentWorkflowStepId: 'step-1',
        action: 'send_email',
        position: 1,
        config: { templateId: 'tpl-1' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const result = generateWorkflowGraph(
      [trigger],
      steps,
      false,
      () => {},
      () => {},
    );

    expect(result.nodes).toHaveLength(8); // 1 trigger, 1 add first step, 2 steps, 2 add step btns, 1 add trigger, 1 exit
    expect(result.edges).toHaveLength(6); // trigger->addFirst, addFirst->step1, step1->addStep1, addStep1->step2, step2->addStep2, addStep2->exit

    // Check Trigger Node
    expect(result.nodes.find((n) => n.id === 'trigger-trigger-1')).toBeDefined();

    // Check Edges
    expect(
      result.edges.find(
        (e) => e.source === 'trigger-trigger-1' && e.target === 'add-first-step-btn',
      ),
    ).toBeDefined();
    expect(
      result.edges.find((e) => e.source === 'add-first-step-btn' && e.target === 'step-step-1'),
    ).toBeDefined();
    expect(
      result.edges.find((e) => e.source === 'step-step-1' && e.target === 'add-step-step-1-linear'),
    ).toBeDefined();
    expect(
      result.edges.find((e) => e.source === 'add-step-step-1-linear' && e.target === 'step-step-2'),
    ).toBeDefined();
    expect(
      result.edges.find((e) => e.source === 'step-step-2' && e.target === 'add-step-step-2-linear'),
    ).toBeDefined();

    // Check positions (Dagre layout should assign coordinates)
    const step1Node = result.nodes.find((n) => n.id === 'step-step-1')!;
    expect(step1Node.position.x).toBeDefined();
    expect(step1Node.position.y).toBeDefined();
  });
});
