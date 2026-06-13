import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowStepCondition } from '../../domain/aggregates/workflow-step-condition.aggregate';
import type { IWorkflowStepConditionRepository } from '../../domain/repositories/workflow-step-condition.repository';

@Injectable()
export class TypeOrmWorkflowStepConditionRepository implements IWorkflowStepConditionRepository {
  constructor(
    @InjectRepository(WorkflowStepCondition)
    private readonly repo: Repository<WorkflowStepCondition>,
  ) {}

  async findByStepId(
    tenantId: string,
    workflowId: string,
    stepId: string,
  ): Promise<WorkflowStepCondition[]> {
    return this.repo.find({
      where: { tenantId, workflowId, workflowStepId: stepId },
      order: { createdAt: 'ASC' },
    });
  }

  async replaceForStep(
    tenantId: string,
    workflowId: string,
    stepId: string,
    conditions: Omit<WorkflowStepCondition, 'id' | 'createdAt' | 'updatedAt' | 'generateId'>[],
  ): Promise<WorkflowStepCondition[]> {
    return this.repo.manager.transaction(async (manager) => {
      await manager.delete(WorkflowStepCondition, { tenantId, workflowId, workflowStepId: stepId });

      if (conditions.length === 0) {
        return [];
      }

      const newEntities = manager.create(WorkflowStepCondition, conditions);
      return manager.save(WorkflowStepCondition, newEntities);
    });
  }
}
