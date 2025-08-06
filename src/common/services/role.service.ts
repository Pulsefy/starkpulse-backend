import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { EmergencyApproval } from '../entities/emergency-approval.entity';
import { SecurityAuditService } from '../security/services/security-audit.service';
import { SecurityEventType, SecurityEventSeverity } from '../security/entities/security-event.entity';
import { CacheService } from '../cache/cache.service';

export interface EmergencyApprovalRequest {
  userId: string;
  reason: string;
  requestedPermissions: string[];
  timeLimit?: number;
  approverIds: string[];
}

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(EmergencyApproval)
    private readonly emergencyApprovalRepository: Repository<EmergencyApproval>,
    private readonly securityAuditService: SecurityAuditService,
    private readonly cacheService: CacheService,
  ) {}

  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const cacheKey = `user:${userId}:role:${roleName}`;
    const cached = await this.cacheService.get(cacheKey);
    
    if (cached !== null) {
      return cached === 'true';
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    const hasRole = user?.roles?.some(role => role.name === roleName) || false;
    await this.cacheService.set(cacheKey, hasRole.toString(), { ttl: this.CACHE_TTL });
    
    return hasRole;
  }

  async hasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
    for (const roleName of roleNames) {
      if (await this.hasRole(userId, roleName)) {
        return true;
      }
    }
    return false;
  }

  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    const cacheKey = `user:${userId}:permission:${permissionName}`;
    const cached = await this.cacheService.get(cacheKey);
    
    if (cached !== null) {
      return cached === 'true';
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions'],
    });

    const hasPermission = user?.roles?.some(role =>
      role.permissions?.some(permission => permission.name === permissionName)
    ) || false;

    await this.cacheService.set(cacheKey, hasPermission.toString(), { ttl: this.CACHE_TTL });
    
    return hasPermission;
  }

  async hasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean> {
    for (const permissionName of permissionNames) {
      if (await this.hasPermission(userId, permissionName)) {
        return true;
      }
    }
    return false;
  }

  async assignRole(userId: string, roleName: string, assignedBy: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    const role = await this.roleRepository.findOne({ where: { name: roleName } });
    if (!role) {
      throw new Error('Role not found');
    }

    if (!user.roles.some(r => r.id === role.id)) {
      user.roles.push(role);
      await this.userRepository.save(user);

      // Clear cache
      await this.clearUserCache(userId);

      // Log role assignment
      await this.securityAuditService.logSecurityEvent({
        eventType: SecurityEventType.USER_PERMISSION_CHANGE,
        severity: SecurityEventSeverity.MEDIUM,
        userId: assignedBy,
        description: `Role '${roleName}' assigned to user ${userId}`,
        metadata: {
          targetUserId: userId,
          roleName,
          action: 'assign',
        },
      });
    }
  }

  async removeRole(userId: string, roleName: string, removedBy: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    user.roles = user.roles.filter(role => role.name !== roleName);
    await this.userRepository.save(user);

    // Clear cache
    await this.clearUserCache(userId);

    // Log role removal
    await this.securityAuditService.logSecurityEvent({
      eventType: SecurityEventType.USER_PERMISSION_CHANGE,
      severity: SecurityEventSeverity.MEDIUM,
      userId: removedBy,
      description: `Role '${roleName}' removed from user ${userId}`,
      metadata: {
        targetUserId: userId,
        roleName,
        action: 'remove',
      },
    });
  }

  async requestEmergencyApproval(
    request: EmergencyApprovalRequest,
  ): Promise<string> {
    const approval = this.emergencyApprovalRepository.create({
      userId: request.userId,
      reason: request.reason,
      requestedPermissions: request.requestedPermissions,
      timeLimit: request.timeLimit || 3600, // 1 hour default
      approverIds: request.approverIds,
      status: 'pending',
      expiresAt: new Date(Date.now() + (request.timeLimit || 3600) * 1000),
    });

    const saved = await this.emergencyApprovalRepository.save(approval);

    // Log emergency approval request
    await this.securityAuditService.logSecurityEvent({
      eventType: SecurityEventType.PRIVILEGE_ESCALATION,
      severity: SecurityEventSeverity.HIGH,
      userId: request.userId,
      description: `Emergency approval requested: ${request.reason}`,
      metadata: {
        approvalId: saved.id,
        requestedPermissions: request.requestedPermissions,
        approverIds: request.approverIds,
        timeLimit: request.timeLimit,
      },
    });

    return saved.id;
  }

  async approveEmergencyRequest(
    approvalId: string,
    approverId: string,
    approved: boolean,
    notes?: string,
  ): Promise<void> {
    const approval = await this.emergencyApprovalRepository.findOne({
      where: { id: approvalId },
    });

    if (!approval) {
      throw new Error('Emergency approval request not found');
    }

    if (approval.status !== 'pending') {
      throw new Error('Emergency approval request is not pending');
    }

    if (!approval.approverIds.includes(approverId)) {
      throw new Error('User not authorized to approve this request');
    }

    approval.status = approved ? 'approved' : 'denied';
    approval.approvedBy = approverId;
    approval.approvedAt = new Date();
    approval.notes = notes;

    if (approved) {
      approval.token = this.generateApprovalToken();
    }

    await this.emergencyApprovalRepository.save(approval);

    // Log approval decision
    await this.securityAuditService.logSecurityEvent({
      eventType: SecurityEventType.PRIVILEGE_ESCALATION,
      severity: SecurityEventSeverity.CRITICAL,
      userId: approverId,
      description: `Emergency approval ${approved ? 'granted' : 'denied'} for user ${approval.userId}`,
      metadata: {
        approvalId,
        targetUserId: approval.userId,
        decision: approved ? 'approved' : 'denied',
        reason: approval.reason,
        notes,
      },
    });
  }

  async validateEmergencyApproval(
    userId: string,
    token: string,
    reason: string,
  ): Promise<boolean> {
    const approval = await this.emergencyApprovalRepository.findOne({
      where: {
        userId,
        token,
        status: 'approved',
        reason,
      },
    });

    if (!approval) {
      return false;
    }

    // Check if approval has expired
    if (approval.expiresAt < new Date()) {
      approval.status = 'expired';
      await this.emergencyApprovalRepository.save(approval);
      return false;
    }

    return true;
  }

  async initializeDisasterRecoveryRoles(): Promise<void> {
    const roles = [
      {
        name: 'DISASTER_RECOVERY_ADMIN',
        description: 'Full disaster recovery administration access',
        permissions: [
          'recovery:admin',
          'recovery:execute',
          'recovery:approve',
          'recovery:audit',
          'system:emergency_access',
          'backup:restore',
          'database:recovery',
        ],
      },
      {
        name: 'DISASTER_RECOVERY_OPERATOR',
        description: 'Disaster recovery operations access',
        permissions: [
          'recovery:execute',
          'recovery:monitor',
          'backup:create',
          'backup:restore',
        ],
      },
      {
        name: 'EMERGENCY_RESPONDER',
        description: 'Emergency response and break-glass access',
        permissions: [
          'emergency:access',
          'recovery:execute',
          'system:emergency_override',
        ],
      },
      {
        name: 'RECOVERY_AUDITOR',
        description: 'Recovery operations audit and monitoring',
        permissions: [
          'recovery:audit',
          'recovery:monitor',
          'logs:view',
        ],
      },
    ];

    for (const roleData of roles) {
      await this.createRoleWithPermissions(roleData.name, roleData.description, roleData.permissions);
    }
  }

  private async createRoleWithPermissions(
    roleName: string,
    description: string,
    permissionNames: string[],
  ): Promise<void> {
    // Create or get role
    let role = await this.roleRepository.findOne({ where: { name: roleName } });
    if (!role) {
      role = this.roleRepository.create({
        name: roleName,
        description,
      });
      role = await this.roleRepository.save(role);
    }

    // Create or get permissions
    const permissions = [];
    for (const permissionName of permissionNames) {
      let permission = await this.permissionRepository.findOne({
        where: { name: permissionName },
      });
      if (!permission) {
        permission = this.permissionRepository.create({
          name: permissionName,
          description: `Permission for ${permissionName}`,
        });
        permission = await this.permissionRepository.save(permission);
      }
      permissions.push(permission);
    }

    // Assign permissions to role
    role.permissions = permissions;
    await this.roleRepository.save(role);
  }

  private async clearUserCache(userId: string): Promise<void> {
    const pattern = `user:${userId}:*`;
    await this.cacheService.invalidatePattern(pattern);
  }

  private generateApprovalToken(): string {
    return `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}