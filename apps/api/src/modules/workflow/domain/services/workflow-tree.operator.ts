import { NotFoundException } from '@nestjs/common';
import { STEP_ACTIONS } from '@email-automation-engine/shared';
import type { WorkflowStep } from '../aggregates/workflow-step.aggregate';

export class WorkflowTreeOperator {
  constructor(private readonly steps: WorkflowStep[]) {}

  public getStepOrThrow(stepId: string): WorkflowStep {
    const step = this.steps.find((s) => s.id === stepId);
    if (!step) throw new NotFoundException('Step not found');
    return step;
  }

  public getStep(stepId: string): WorkflowStep | undefined {
    return this.steps.find((s) => s.id === stepId);
  }

  public unlinkStep(stepId: string): Set<WorkflowStep> {
    const modified = new Set<WorkflowStep>();
    const stepToUnlink = this.getStepOrThrow(stepId);

    const linearChild = this.steps.find((s) => s.parentWorkflowStepId === stepId);
    const replacementId =
      linearChild?.id || stepToUnlink.trueStepId || stepToUnlink.falseStepId || null;

    if (linearChild) {
      linearChild.parentWorkflowStepId = stepToUnlink.parentWorkflowStepId;
      modified.add(linearChild);
    } else if (replacementId) {
      const promotedChild = this.getStep(replacementId);
      if (promotedChild) {
        promotedChild.parentWorkflowStepId = stepToUnlink.parentWorkflowStepId;
        modified.add(promotedChild);
      }
    }

    const conditionalParents = this.steps.filter(
      (s) => s.trueStepId === stepId || s.falseStepId === stepId,
    );
    for (const parent of conditionalParents) {
      if (parent.trueStepId === stepId) parent.trueStepId = replacementId;
      if (parent.falseStepId === stepId) parent.falseStepId = replacementId;
      modified.add(parent);
    }

    return modified;
  }

  public spliceStep(
    stepToMove: WorkflowStep,
    targetParentId: string | null,
    branch: 'linear' | true | false,
  ): Set<WorkflowStep> {
    const modified = new Set<WorkflowStep>();
    let existingChild: WorkflowStep | undefined;

    if (targetParentId === null) {
      existingChild = this.steps.find(
        (s) =>
          s.id !== stepToMove.id &&
          !s.parentWorkflowStepId &&
          !this.steps.some((p) => p.trueStepId === s.id || p.falseStepId === s.id),
      );
      stepToMove.parentWorkflowStepId = null;
    } else {
      const parentStep = this.getStepOrThrow(targetParentId);

      if (branch === true) {
        existingChild = this.steps.find(
          (s) => s.id === parentStep.trueStepId && s.id !== stepToMove.id,
        );
        parentStep.trueStepId = stepToMove.id;
        stepToMove.parentWorkflowStepId = null;
      } else if (branch === false) {
        existingChild = this.steps.find(
          (s) => s.id === parentStep.falseStepId && s.id !== stepToMove.id,
        );
        parentStep.falseStepId = stepToMove.id;
        stepToMove.parentWorkflowStepId = null;
      } else {
        existingChild = this.steps.find(
          (s) => s.parentWorkflowStepId === targetParentId && s.id !== stepToMove.id,
        );
        stepToMove.parentWorkflowStepId = targetParentId;
      }
      modified.add(parentStep);
    }

    if (existingChild) {
      if (stepToMove.action === STEP_ACTIONS.CONDITIONAL_SPLIT) {
        stepToMove.trueStepId = existingChild.id;
        existingChild.parentWorkflowStepId = null;
      } else {
        existingChild.parentWorkflowStepId = stepToMove.id;
      }
      modified.add(existingChild);
    }

    if (stepToMove.action === STEP_ACTIONS.CONDITIONAL_SPLIT) {
      if (stepToMove.trueStepId && stepToMove.trueStepId !== existingChild?.id)
        stepToMove.trueStepId = null;
      if (stepToMove.falseStepId && stepToMove.falseStepId !== existingChild?.id)
        stepToMove.falseStepId = null;
    }

    modified.add(stepToMove);
    return modified;
  }
}
