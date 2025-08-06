import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleService } from '../services/role.service';
import { SecurityAuditService } from '../security/services/security-audit.service';
import { PERMISSIONS_KEY, ROLES_KEY, EMERGENCY_ACCESS_KEY } from '../decorators/permissions.decorator';
import { SecurityEventType, SecurityEventSeverity } from '../security/entities/security-event.entity';

export interface EmergencyAccessContext {
  reason: string;
  approvalRequired: boolean;
  mfaRequired: boolean;
  timeLimit?: number;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly roleService: RoleService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Check for emergency access requirements
    const emergencyAccess = this.reflector.getAllAndOverride<EmergencyAccessContext>(
      EMERGENCY_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (emergencyAccess) {
      return this.handleEmergencyAccess(user, request, emergencyAccess, context);
    }

    // Regular permission checks
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions && !requiredRoles) {
      return true;
    }

    const hasPermission = await this.checkPermissions(
      user,
      requiredPermissions,
      requiredRoles,
    );

    if (!hasPermission) {
      await this.logUnauthorizedAccess(user, request, context);
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  private async handleEmergencyAccess(
    user: any,
    request: any,
    emergencyAccess: EmergencyAccessContext,
    context: ExecutionContext,
  ): Promise<boolean> {
    // Check if user has emergency access role
    const hasEmergencyRole = await this.roleService.hasRole(user.id, 'EMERGENCY_RESPONDER');
    
    if (!hasEmergencyRole) {
      await this.logEmergencyAccessDenied(user, request, 'No emergency role');
      throw new ForbiddenException('Emergency access denied: Insufficient role');
    }

    // Check MFA if required
    if (emergencyAccess.mfaRequired && !request.headers['x-mfa-verified']) {
      await this.logEmergencyAccessDenied(user, request, 'MFA required');
      throw new ForbiddenException('Emergency access denied: MFA verification required');
    }

    // Check approval if required
    if (emergencyAccess.approvalRequired) {
      const approvalToken = request.headers['x-emergency-approval'];
      const isApproved = await this.roleService.validateEmergencyApproval(
        user.id,
        approvalToken,
        emergencyAccess.reason,
      );
      
      if (!isApproved) {
        await this.logEmergencyAccessDenied(user, request, 'Approval required');
        throw new ForbiddenException('Emergency access denied: Approval required');
      }
    }

    // Log emergency access granted
    await this.logEmergencyAccessGranted(user, request, emergencyAccess);
    
    return true;
  }

  private async checkPermissions(
    user: any,
    requiredPermissions?: string[],
    requiredRoles?: string[],
  ): Promise<boolean> {
    if (requiredRoles?.length) {
      const hasRole = await this.roleService.hasAnyRole(user.id, requiredRoles);
      if (!hasRole) return false;
    }

    if (requiredPermissions?.length) {
      const hasPermission = await this.roleService.hasAnyPermission(
        user.id,
        requiredPermissions,
      );
      if (!hasPermission) return false;
    }

    return true;
  }

  private async logUnauthorizedAccess(
    user: any,
    request: any,
    context: ExecutionContext,
  ): Promise<void> {
    await this.securityAuditService.logSecurityEvent({
      eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
      severity: SecurityEventSeverity.HIGH,
      userId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      endpoint: request.url,
      method: request.method,
      description: `Unauthorized access attempt to ${context.getClass().name}.${context.getHandler().name}`,
      metadata: {
        userRoles: user.roles,
        requestedResource: request.url,
      },
    });
  }

  private async logEmergencyAccessGranted(
    user: any,
    request: any,
    emergencyAccess: EmergencyAccessContext,
  ): Promise<void> {
    await this.securityAuditService.logSecurityEvent({
      eventType: SecurityEventType.PRIVILEGE_ESCALATION,
      severity: SecurityEventSeverity.CRITICAL,
      userId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      endpoint: request.url,
      method: request.method,
      description: `Emergency access granted: ${emergencyAccess.reason}`,
      metadata: {
        emergencyReason: emergencyAccess.reason,
        mfaRequired: emergencyAccess.mfaRequired,
        approvalRequired: emergencyAccess.approvalRequired,
        timeLimit: emergencyAccess.timeLimit,
      },
    });
  }

  private async logEmergencyAccessDenied(
    user: any,
    request: any,
    reason: string,
  ): Promise<void> {
    await this.securityAuditService.logSecurityEvent({
      eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
      severity: SecurityEventSeverity.CRITICAL,
      userId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      endpoint: request.url,
      method: request.method,
      description: `Emergency access denied: ${reason}`,
      metadata: {
        denialReason: reason,
        attemptedEmergencyAccess: true,
      },
    });
  }
}