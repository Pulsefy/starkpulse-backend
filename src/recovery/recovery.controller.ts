import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RecoveryService, RecoveryOperationRequest, RecoveryExecutionContext } from './recovery.service';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { WalletAuthGuard } from '../auth/guards/wallet-auth.guard';
import { RequirePermissions, RequireRoles, RequireEmergencyAccess } from '../common/decorators/permissions.decorator';
import { CreateRecoveryOperationDto } from './dto/create-recovery-operation.dto';
import { ApproveRecoveryOperationDto } from './dto/approve-recovery-operation.dto';
import { ExecuteRecoveryOperationDto } from './dto/execute-recovery-operation.dto';
import { GetRecoveryOperationsDto } from './dto/get-recovery-operations.dto';

@Controller('recovery')
@UseGuards(WalletAuthGuard, PermissionsGuard)
export class RecoveryController {
  constructor(private readonly recoveryService: RecoveryService) {}

  @Post('operations')
  @RequirePermissions(['recovery:admin', 'recovery:execute'])
  @HttpCode(HttpStatus.CREATED)
  async createRecoveryOperation(
    @Body() createDto: CreateRecoveryOperationDto,
    @Request() req: any,
  ) {
    const operationId = await this.recoveryService.createRecoveryOperation(
      createDto as RecoveryOperationRequest,
      req.user.id,
    );

    return {
      success: true,
      operationId,
      message: 'Recovery operation created successfully',
    };
  }

  @Put('operations/:id/approve')
  @RequirePermissions(['recovery:admin', 'recovery:approve'])
  async approveRecoveryOperation(
    @Param('id') operationId: string,
    @Body() approveDto: ApproveRecoveryOperationDto,
    @Request() req: any,
  ) {
    await this.recoveryService.approveRecoveryOperation(
      operationId,
      req.user.id,
      approveDto.approved,
      approveDto.notes,
    );

    return {
      success: true,
      message: `Recovery operation ${approveDto.approved ? 'approved' : 'rejected'} successfully`,
    };
  }

  @Post('operations/:id/execute')
  @RequirePermissions(['recovery:admin', 'recovery:execute'])
  async executeRecoveryOperation(
    @Param('id') operationId: string,
    @Body() executeDto: ExecuteRecoveryOperationDto,
    @Request() req: any,
  ) {
    const context: RecoveryExecutionContext = {
      operationId,
      userId: req.user.id,
      approvalToken: executeDto.approvalToken,
      mfaToken: executeDto.mfaToken,
      emergencyOverride: executeDto.emergencyOverride,
    };

    await this.recoveryService.executeRecoveryOperation(context);

    return {
      success: true,
      message: 'Recovery operation executed successfully',
    };
  }

  @Post('operations/:id/emergency-execute')
  @RequireEmergencyAccess({
    reason: 'Emergency recovery operation execution',
    approvalRequired: false,
    mfaRequired: true,
  })
  async emergencyExecuteRecoveryOperation(
    @Param('id') operationId: string,
    @Body() executeDto: ExecuteRecoveryOperationDto,
    @Request() req: any,
  ) {
    const context: RecoveryExecutionContext = {
      operationId,
      userId: req.user.id,
      emergencyOverride: true,
      mfaToken: executeDto.mfaToken,
    };

    await this.recoveryService.executeRecoveryOperation(context);

    return {
      success: true,
      message: 'Emergency recovery operation executed successfully',
    };
  }

  @Get('operations')
  @RequirePermissions(['recovery:admin', 'recovery:audit', 'recovery:monitor'])
  async getRecoveryOperations(
    @Query() queryDto: GetRecoveryOperationsDto,
    @Request() req: any,
  ) {
    const operations = await this.recoveryService.getRecoveryOperations(
      req.user.id,
      {
        status: queryDto.status,
        type: queryDto.type,
        riskLevel: queryDto.riskLevel,
        dateFrom: queryDto.dateFrom ? new Date(queryDto.dateFrom) : undefined,
        dateTo: queryDto.dateTo ? new Date(queryDto.dateTo) : undefined,
      },
    );

    return {
      success: true,
      data: operations,
      count: operations.length,
    };
  }

  @Get('operations/:id')
  @RequirePermissions(['recovery:admin', 'recovery:audit', 'recovery:monitor'])
  async getRecoveryOperation(
    @Param('id') operationId: string,
    @Request() req: any,
  ) {
    const operations = await this.recoveryService.getRecoveryOperations(
      req.user.id,
      { status: undefined },
    );
    
    const operation = operations.find(op => op.id === operationId);
    
    if (!operation) {
      return {
        success: false,
        message: 'Recovery operation not found',
      };
    }

    return {
      success: true,
      data: operation,
    };
  }

  @Post('break-glass')
  @RequireEmergencyAccess({
    reason: 'Break-glass emergency access',
    approvalRequired: true,
    mfaRequired: true,
  })
  async breakGlassAccess(
    @Body() body: { reason: string; targetSystems: string[] },
    @Request() req: any,
  ) {
    const operationId = await this.recoveryService.createRecoveryOperation(
      {
        type: 'emergency_access',
        description: `Break-glass access: ${body.reason}`,
        targetSystems: body.targetSystems,
        estimatedDuration: 3600, // 1 hour
        riskLevel: 'critical',
        approvalRequired: false, // Emergency access bypasses normal approval
        mfaRequired: true,
      },
      req.user.id,
    );

    const context: RecoveryExecutionContext = {
      operationId,
      userId: req.user.id,
      emergencyOverride: true,
    };

    await this.recoveryService.executeRecoveryOperation(context);

    return {
      success: true,
      operationId,
      message: 'Break-glass access granted',
    };
  }
}