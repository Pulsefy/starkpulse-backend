import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecoveryOperation } from './entities/recovery-operation.entity';
import { RecoveryApproval } from './entities/recovery-approval.entity';
import { SecurityAuditService } from '../common/security/services/security-audit.service';
import { RoleService } from '../common/services/role.service';
import { SecurityEventType, SecurityEventSeverity } from '../common/security/entities/security-event.entity';
import { CacheService } from '../common/cache/cache.service';

export interface RecoveryOperationRequest {
  type: 'database_restore' | 'system_recovery' | 'emergency_access' | 'backup_restore';
  description: string;
  targetSystems: string[];
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  approvalRequired: boolean;
  mfaRequired: boolean;
  metadata?: Record<string, any>;
}

export interface RecoveryExecutionContext {
  operationId: string;
  userId: string;
  approvalToken?: string;
  mfaToken?: string;
  emergencyOverride?: boolean;
}

@Injectable()
export class RecoveryService {
  private readonly logger = new Logger(RecoveryService.name);

  constructor(
    @InjectRepository(RecoveryOperation)
    private readonly recoveryOperationRepository: Repository<RecoveryOperation>,
    @InjectRepository(RecoveryApproval)
    private readonly recoveryApprovalRepository: Repository<RecoveryApproval>,
    private readonly securityAuditService: SecurityAuditService,
    private readonly roleService: RoleService,
    private readonly cacheService: CacheService,
  ) {}

  async createRecoveryOperation(
    request: RecoveryOperationRequest,
    createdBy: string,
  ): Promise<string> {
    // Validate user permissions
    const canCreate = await this.roleService.hasAnyPermission(createdBy, [
      'recovery:admin',
      'recovery:execute',
    ]);

    if (!canCreate) {
      throw new ForbiddenException('Insufficient permissions to create recovery operation');
    }

    const operation = this.recoveryOperationRepository.create({
      type: request.type,
      description: request.description,
      targetSystems: request.targetSystems,
      estimatedDuration: request.estimatedDuration,
      riskLevel: request.riskLevel,
      status: request.approvalRequired ? 'pending_approval' : 'ready',
      createdBy,
      approvalRequired: request.approvalRequired,
      mfaRequired: request.mfaRequired,
      metadata: request.metadata,
    });

    const saved = await this.recoveryOperationRepository.save(operation);

    // Log operation creation
    await this.securityAuditService.logSecurityEvent({
      eventType: SecurityEventType.CONFIGURATION_CHANGE,
      severity: this.mapRiskToSeverity(request.riskLevel),
      userId: createdBy,
      description: `Recovery operation created: ${request.type}`,
      metadata: {
        operationId: saved.id,
        type: request.type,
        riskLevel: request.riskLevel,
        targetSystems: request.targetSystems,
        approvalRequired: request.approvalRequired,
      },
    });

    return saved.id;
  }

  async approveRecoveryOperation(
    operationId: string,
    approverId: string,
    approved: boolean,
    notes?: string,
  ): Promise<void> {
    const operation = await this.recoveryOperationRepository.findOne({
      where: { id: operationId },
    });

    if (!operation) {
      throw new Error('Recovery operation not found');
    }

    // Validate approver permissions
    const canApprove = await this.roleService.hasAnyPermission(approverId, [
      'recovery:admin',
      'recovery:approve',
    ]);

    if (!canApprove) {
      throw new ForbiddenException('Insufficient permissions to approve recovery operation');
    }

    // Create approval record
    const approval = this.recoveryApprovalRepository.create({
      operationId,
      approverId,
      approved,
      notes,
      approvedAt: new Date(),
    });

    await this.recoveryApprovalRepository.save(approval);

    // Update operation status
    operation.status = approved ? 'approved' : 'rejected';
    if (approved) {
      operation.approvedBy = approverId;
      operation.approvedAt = new Date();
    }

    await this.recoveryOperationRepository.save(operation);

    // Log approval
    await this.securityAuditService.logSecurityEvent({
      eventType: SecurityEventType.USER_PERMISSION_CHANGE,
      severity: SecurityEventSeverity.HIGH,
      userId: approverId,
      description: `Recovery operation ${approved ? 'approved' : 'rejected'}: ${operation.type}`,
      metadata: {
        operationId,
        decision: approved ? 'approved' : 'rejected',
        notes,
        operationType: operation.type,
        riskLevel: operation.riskLevel,
      },
    });
  }

  async executeRecoveryOperation(
    context: RecoveryExecutionContext,
  ): Promise<void> {
    const operation = await this.recoveryOperationRepository.findOne({
      where: { id: context.operationId },
    });

    if (!operation) {
      throw new Error('Recovery operation not found');
    }

    // Validate execution permissions
    await this.validateExecutionPermissions(operation, context);

    // Update operation status
    operation.status = 'executing';
    operation.executedBy = context.userId;
    operation.executedAt = new Date();
    await this.recoveryOperationRepository.save(operation);

    try {
      // Log execution start
      await this.securityAuditService.logSecurityEvent({
        eventType: SecurityEventType.SYSTEM_BREACH_ATTEMPT,
        severity: this.mapRiskToSeverity(operation.riskLevel),
        userId: context.userId,
        description: `Recovery operation execution started: ${operation.type}`,
        metadata: {
          operationId: context.operationId,
          type: operation.type,
          targetSystems: operation.targetSystems,
          emergencyOverride: context.emergencyOverride,
        },
      });

      // Execute the actual recovery operation
      await this.performRecoveryOperation(operation, context);

      // Update operation status
      operation.status = 'completed';
      operation.completedAt = new Date();
      await this.recoveryOperationRepository.save(operation);

      // Log successful completion
      await this.securityAuditService.logSecurityEvent({
        eventType: SecurityEventType.CONFIGURATION_CHANGE,
        severity: SecurityEventSeverity.HIGH,
        userId: context.userId,
        description: `Recovery operation completed successfully: ${operation.type}`,
        metadata: {
          operationId: context.operationId,
          type: operation.type,
          duration: Date.now() - operation.executedAt.getTime(),
        },
      });

    } catch (error) {
      // Update operation status
      operation.status = 'failed';
      operation.errorMessage = error.message;
      await this.recoveryOperationRepository.save(operation);

      // Log failure
      await this.securityAuditService.logSecurityEvent({
        eventType: SecurityEventType.SYSTEM_ANOMALY,
        severity: SecurityEventSeverity.CRITICAL,
        userId: context.userId,
        description: `Recovery operation failed: ${operation.type}`,
        metadata: {
          operationId: context.operationId,
          type: operation.type,
          error: error.message,
        },
      });

      throw error;
    }
  }

  async getRecoveryOperations(
    userId: string,
    filters?: {
      status?: string;
      type?: string;
      riskLevel?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<RecoveryOperation[]> {
    // Validate user permissions
    const canView = await this.roleService.hasAnyPermission(userId, [
      'recovery:admin',
      'recovery:audit',
      'recovery:monitor',
    ]);

    if (!canView) {
      throw new ForbiddenException('Insufficient permissions to view recovery operations');
    }

    const queryBuilder = this.recoveryOperationRepository.createQueryBuilder('operation');

    if (filters?.status) {
      queryBuilder.andWhere('operation.status = :status', { status: filters.status });
    }

    if (filters?.type) {
      queryBuilder.andWhere('operation.type = :type', { type: filters.type });
    }

    if (filters?.riskLevel) {
      queryBuilder.andWhere('operation.riskLevel = :riskLevel', { riskLevel: filters.riskLevel });
    }

    if (filters?.dateFrom) {
      queryBuilder.andWhere('operation.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters?.dateTo) {
      queryBuilder.andWhere('operation.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }

    return queryBuilder
      .orderBy('operation.createdAt', 'DESC')
      .getMany();
  }

  private async validateExecutionPermissions(
    operation: RecoveryOperation,
    context: RecoveryExecutionContext,
  ): Promise<void> {
    // Check basic execution permissions
    const canExecute = await this.roleService.hasAnyPermission(context.userId, [
      'recovery:admin',
      'recovery:execute',
    ]);

    if (!canExecute) {
      throw new ForbiddenException('Insufficient permissions to execute recovery operation');
    }

    // Check if operation requires approval
    if (operation.approvalRequired && operation.status !== 'approved' && !context.emergencyOverride) {
      throw new ForbiddenException('Recovery operation requires approval');
    }

    // Check MFA requirement
    if (operation.mfaRequired && !context.mfaToken && !context.emergencyOverride) {
      throw new ForbiddenException('Recovery operation requires MFA verification');
    }

    // Validate emergency override
    if (context.emergencyOverride) {
      const hasEmergencyRole = await this.roleService.hasRole(context.userId, 'EMERGENCY_RESPONDER');
      if (!hasEmergencyRole) {
        throw new ForbiddenException('Emergency override requires EMERGENCY_RESPONDER role');
      }
    }
  }

  private async performRecoveryOperation(
    operation: RecoveryOperation,
    context: RecoveryExecutionContext,
  ): Promise<void> {
    // This is where the actual recovery logic would be implemented
    // For now, we'll simulate the operation
    
    this.logger.log(`Executing recovery operation: ${operation.type}`);
    
    switch (operation.type) {
      case 'database_restore':
        await this.performDatabaseRestore(operation, context);
        break;
      case 'system_recovery':
        await this.performSystemRecovery(operation, context);
        break;
      case 'emergency_access':
        await this.performEmergencyAccess(operation, context);
        break;
      case 'backup_restore':
        await this.performBackupRestore(operation, context);
        break;
      default:
        throw new Error(`Unknown recovery operation type: ${operation.type}`);
    }
  }

  private async performDatabaseRestore(
    operation: RecoveryOperation,
    context: RecoveryExecutionContext,
  ): Promise<void> {
    // Simulate database restore
    this.logger.log('Performing database restore...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.logger.log('Database restore completed');
  }

  private async performSystemRecovery(
    operation: RecoveryOperation,
    context: RecoveryExecutionContext,
  ): Promise<void> {
    // Simulate system recovery
    this.logger.log('Performing system recovery...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    this.logger.log('System recovery completed');
  }

  private async performEmergencyAccess(
    operation: RecoveryOperation,
    context: RecoveryExecutionContext,
  ): Promise<void> {
    // Simulate emergency access
    this.logger.log('Granting emergency access...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.logger.log('Emergency access granted');
  }

  private async performBackupRestore(
    operation: RecoveryOperation,
    context: RecoveryExecutionContext,
  ): Promise<void> {
    // Simulate backup restore
    this.logger.log('Performing backup restore...');
    await new Promise(resolve => setTimeout(resolve, 4000));
    this.logger.log('Backup restore completed');
  }

  private mapRiskToSeverity(riskLevel: string): SecurityEventSeverity {
    switch (riskLevel) {
      case 'low':
        return SecurityEventSeverity.LOW;
      case 'medium':
        return SecurityEventSeverity.MEDIUM;
      case 'high':
        return SecurityEventSeverity.HIGH;
      case 'critical':
        return SecurityEventSeverity.CRITICAL;
      default:
        return SecurityEventSeverity.MEDIUM;
    }
  }
}