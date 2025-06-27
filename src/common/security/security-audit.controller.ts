import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SecurityAuditService } from './services/security-audit.service';
import { SecurityEventQueryDto, SecurityEventResponseDto } from './dto/security-event.dto';
import { SecurityAnomalyQueryDto, SecurityAnomalyResponseDto } from './dto/security-anomaly.dto';
import { SecurityThreatQueryDto, SecurityThreatResponseDto } from './dto/security-threat.dto';
import { RateLimitGuard } from '../guards/rate-limit.guard';

@ApiTags('Security Audit')
@Controller('security')
@UseGuards(RateLimitGuard)
export class SecurityAuditController {
  constructor(private readonly securityAuditService: SecurityAuditService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get security dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  async getDashboard() {
    return this.securityAuditService.getSecurityDashboardMetrics();
  }

  @Get('events')
  @ApiOperation({ summary: 'Query security events' })
  @ApiResponse({ status: 200, type: [SecurityEventResponseDto] })
  async getEvents(@Query() query: SecurityEventQueryDto) {
    return this.securityAuditService.querySecurityEvents(query);
  }

  @Get('anomalies')
  @ApiOperation({ summary: 'Query security anomalies' })
  @ApiResponse({ status: 200, type: [SecurityAnomalyResponseDto] })
  async getAnomalies(@Query() query: SecurityAnomalyQueryDto) {
    return this.securityAuditService.querySecurityAnomalies(query);
  }

  @Get('threats')
  @ApiOperation({ summary: 'Query security threats' })
  @ApiResponse({ status: 200, type: [SecurityThreatResponseDto] })
  async getThreats(@Query() query: SecurityThreatQueryDto) {
    return this.securityAuditService.querySecurityThreats(query);
  }
} 