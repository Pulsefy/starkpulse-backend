import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';
import * as process from 'process';

export interface SystemHealth {
  cpuUsage: number;
  memoryUsage: number;
  loadAverage: number[];
  uptime: number;
  freeMemory: number;
  totalMemory: number;
}

@Injectable()
export class SystemHealthService {
  private readonly logger = new Logger(SystemHealthService.name);
  private cpuUsageHistory: number[] = [];
  private readonly maxHistoryLength = 10;

  constructor() {
    // Start CPU monitoring
    this.startCpuMonitoring();
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      cpuUsage: this.getAverageCpuUsage(),
      memoryUsage: (usedMemory / totalMemory) * 100,
      loadAverage: os.loadavg(),
      uptime: os.uptime(),
      freeMemory,
      totalMemory,
    };
  }

  private startCpuMonitoring(): void {
    const startUsage = process.cpuUsage();
    
    setInterval(() => {
      const currentUsage = process.cpuUsage(startUsage);
      const cpuPercent = (currentUsage.user + currentUsage.system) / 1000000; // Convert to seconds
      
      this.cpuUsageHistory.push(cpuPercent);
      
      // Keep only recent history
      if (this.cpuUsageHistory.length > this.maxHistoryLength) {
        this.cpuUsageHistory.shift();
      }
    }, 1000);
  }

  private getAverageCpuUsage(): number {
    if (this.cpuUsageHistory.length === 0) return 0;
    
    const sum = this.cpuUsageHistory.reduce((acc, val) => acc + val, 0);
    return (sum / this.cpuUsageHistory.length) * 100;
  }
}

