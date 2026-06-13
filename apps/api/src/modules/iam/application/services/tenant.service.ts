import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import {
  type CreateTenantDto,
  type UpdateTenantDto,
  type TenantResponse,
  permissionsCatalog,
} from '@email-automation-engine/shared';
import { DataSource } from 'typeorm';
import {
  TENANT_REPOSITORY,
  ROLE_REPOSITORY,
  TENANT_MEMBERSHIP_REPOSITORY,
} from '../../constants/tokens';
import { type TenantRepository } from '../../domain/repositories/tenant.repository';
import { type RoleRepository } from '../../domain/repositories/role.repository';
import { type TenantMembershipRepository } from '../../domain/repositories/tenant-membership.repository';
import { Tenant } from '../../domain/aggregates/tenant.aggregate';
import { Role } from '../../domain/aggregates/role.aggregate';
import { RolePermission } from '../../domain/aggregates/role-permission.aggregate';
import { TenantMembership } from '../../domain/aggregates/tenant-membership.aggregate';

@Injectable()
export class TenantService {
  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepo: TenantRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: RoleRepository,
    @Inject(TENANT_MEMBERSHIP_REPOSITORY)
    private readonly membershipRepo: TenantMembershipRepository,
    @Optional()
    private readonly dataSource?: DataSource,
  ) {}

  async create(userId: string, dto: CreateTenantDto): Promise<TenantResponse> {
    const execute = async (
      saveTenant: (t: Tenant) => Promise<Tenant>,
      saveRole: (r: Role) => Promise<Role>,
      savePermission: (p: RolePermission) => Promise<RolePermission>,
      saveMembership: (m: TenantMembership) => Promise<TenantMembership>,
    ) => {
      const tenant = new Tenant();
      tenant.name = dto.name;
      tenant.creatorId = userId;
      const savedTenant = await saveTenant(tenant);

      const role = new Role();
      role.tenantId = savedTenant.id;
      role.name = 'Full Access';
      role.slug = 'full-access';
      role.description = 'Full administrative access to the tenant';
      const savedRole = await saveRole(role);

      for (const permissionName of permissionsCatalog) {
        const rolePerm = new RolePermission();
        rolePerm.roleId = savedRole.id;
        rolePerm.permission = permissionName;
        await savePermission(rolePerm);
      }

      const membership = new TenantMembership();
      membership.tenantId = savedTenant.id;
      membership.userId = userId;
      membership.roleId = savedRole.id;
      await saveMembership(membership);

      return savedTenant;
    };

    if (this.dataSource) {
      const savedTenant = await this.dataSource.transaction(async (manager) => {
        return execute(
          (tenant) => manager.save(tenant),
          (role) => manager.save(role),
          (permission) => manager.save(permission),
          (membership) => manager.save(membership),
        );
      });
      return this.mapToResponse(savedTenant);
    } else {
      const savedTenant = await execute(
        (tenant) => this.tenantRepo.save(tenant),
        (role) => this.roleRepo.save(role),
        (permission) => this.roleRepo.savePermission(permission),
        (membership) => this.membershipRepo.save(membership),
      );
      return this.mapToResponse(savedTenant);
    }
  }

  async findById(id: string, userId: string): Promise<TenantResponse> {
    const tenant = await this.tenantRepo.findById(id);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const membership = await this.membershipRepo.findByUserAndTenant(userId, id);
    if (!membership && tenant.creatorId !== userId) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    return this.mapToResponse(tenant);
  }

  async findByUser(userId: string): Promise<TenantResponse[]> {
    const memberships = await this.membershipRepo.findMembershipsByUser(userId);
    const tenantIds = memberships.map((membership) => membership.tenantId);

    const tenants = await this.tenantRepo.findByIds(tenantIds);

    const createdTenants = await this.tenantRepo.findByCreatorId(userId);
    for (const createdTenant of createdTenants) {
      if (!tenants.some((existingTenant) => existingTenant.id === createdTenant.id)) {
        tenants.push(createdTenant);
      }
    }

    return tenants.map((t) => this.mapToResponse(t));
  }

  async update(id: string, dto: UpdateTenantDto): Promise<TenantResponse> {
    const tenant = await this.tenantRepo.findById(id);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    if (dto.name) {
      tenant.name = dto.name;
    }
    const updated = await this.tenantRepo.save(tenant);
    return this.mapToResponse(updated);
  }

  private mapToResponse(tenant: Tenant): TenantResponse {
    return {
      id: tenant.id,
      name: tenant.name,
      creatorId: tenant.creatorId,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  }
}
