import { ApiProperty } from '@nestjs/swagger';

export class RateLimitStatsDto {
  @ApiProperty({ description: 'User ID' })
  userId?: number;

  @ApiProperty({ description: 'Rate limit key' })
  key: string;

  @ApiProperty({ description: 'Bucket size' })
  bucketSize: number;

  @ApiProperty({ description: 'Refill rate' })
  refillRate: number;

  @ApiProperty({ description: 'Tokens left' })
  tokensLeft: number;

  @ApiProperty({ description: 'Last request time' })
  lastRequestTime: Date;

  @ApiProperty({ description: 'Number of denied requests' })
  deniedRequests: number;

  @ApiProperty({ description: 'Total requests' })
  totalRequests: number;

  @ApiProperty({ description: 'System CPU load percentage' })
  systemCpuLoad: number;

  @ApiProperty({ description: 'System memory load percentage' })
  systemMemoryLoad: number;

  @ApiProperty({ description: 'Current adaptive multiplier' })
  adaptiveMultiplier: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class SystemMetricsDto {
  @ApiProperty({ description: 'Total number of users' })
  totalUsers: number;

  @ApiProperty({ description: 'Total requests' })
  totalRequests: number;

  @ApiProperty({ description: 'Total denied requests' })
  totalDeniedRequests: number;

  @ApiProperty({ description: 'Average CPU load percentage' })
  averageCpuLoad: number;

  @ApiProperty({ description: 'Average memory load percentage' })
  averageMemoryLoad: number;

  @ApiProperty({ description: 'Average adaptive multiplier' })
  averageAdaptiveMultiplier: number;

  @ApiProperty({ description: 'Current system metrics' })
  currentSystemMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    systemLoad: number;
    cores: number;
  };
}

export class RateLimitStatsResponseDto {
  @ApiProperty({ description: 'System-wide metrics' })
  systemMetrics: SystemMetricsDto;

  @ApiProperty({ description: 'User-specific rate limit stats', type: [RateLimitStatsDto] })
  userStats: RateLimitStatsDto[];

  @ApiProperty({ description: 'Response timestamp' })
  timestamp: Date;
} 