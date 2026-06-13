import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { TriggerCacheService } from './trigger-cache.service';
import type { ICacheService } from '../../../../infrastructure/cache/cache.interface';
import type { WorkflowTriggerRepository } from '../../../workflow/domain/repositories/workflow-trigger.repository';

describe('TriggerCacheService', () => {
  let service: TriggerCacheService;
  let cacheService: { get: Mock; set: Mock; del: Mock };
  let triggerRepository: { findActiveByEvent: Mock };

  beforeEach(() => {
    cacheService = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };
    triggerRepository = {
      findActiveByEvent: vi.fn(),
    };
    service = new TriggerCacheService(
      cacheService as unknown as ICacheService,
      triggerRepository as unknown as WorkflowTriggerRepository,
    );
  });

  it('should return from cache if hit', async () => {
    const cachedAt = new Date().toISOString();
    cacheService.get.mockResolvedValue([
      {
        id: '1',
        tenantId: 'tenant-1',
        workflowId: 'workflow-1',
        event: 'event-1',
        createdAt: cachedAt,
        updatedAt: cachedAt,
      },
    ]);
    const result = await service.getMatchingTriggers('tenant-1', 'event-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].createdAt.toISOString()).toBe(cachedAt);
    expect(triggerRepository.findActiveByEvent).not.toHaveBeenCalled();
  });

  it('should fetch from DB and set cache on miss', async () => {
    cacheService.get.mockResolvedValue(null);
    triggerRepository.findActiveByEvent.mockResolvedValue([{ id: '2' }]);

    const result = await service.getMatchingTriggers('tenant-1', 'event-1');
    expect(result).toEqual([{ id: '2' }]);
    expect(triggerRepository.findActiveByEvent).toHaveBeenCalledWith('tenant-1', 'event-1');
    expect(cacheService.set).toHaveBeenCalledWith(
      'automation:triggers:tenant:tenant-1:event:event-1',
      [{ id: '2' }],
      300,
    );
  });

  it('should fall back to DB if cache get fails', async () => {
    cacheService.get.mockRejectedValue(new Error('Redis down'));
    triggerRepository.findActiveByEvent.mockResolvedValue([{ id: '3' }]);

    const result = await service.getMatchingTriggers('tenant-1', 'event-1');
    expect(result).toEqual([{ id: '3' }]);
    expect(triggerRepository.findActiveByEvent).toHaveBeenCalledWith('tenant-1', 'event-1');
  });
});
