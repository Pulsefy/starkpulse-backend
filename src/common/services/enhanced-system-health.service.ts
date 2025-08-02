import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';
import * as process from 'process';

export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    used: number;
    free: number;
    total: number;
    usage: number;
    heapUsed: number;
    heapTotal: number;
    heapUsage: number;
  };
  load: {
    systemLoad: number;
    processLoad: number;
  };
  timestamp: Date;
}

@Injectable()
export class EnhancedSystemHealthService {
  private readonly logger = new Logger(EnhancedSystemHealthService.name);
  private cpuUsageHistory: number[] = [];
  private readonly maxHistoryLength = 10;
  private lastCpuUsage = process.cpuUsage();
  private lastCpuTime = Date.now();

  constructor() {
    this.startCpuMonitoring();
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const loadAverage = os.loadavg();

    return {
      cpu: {
        usage: this.getAverageCpuUsage(),
        loadAverage,
        cores: os.cpus().length,
      },
      memory: {
        used: usedMemory,
        free: freeMemory,
        total: totalMemory,
        usage: (usedMemory / totalMemory) * 100,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        heapUsage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
      load: {
        systemLoad: loadAverage[0],
        processLoad: this.getProcessLoad(),
      },
      timestamp: new Date(),
    };
  }

  getCpuUsage(): number {
    return this.getAverageCpuUsage();
  }

  getMemoryUsage(): number {
    const memoryUsage = process.memoryUsage();
    return (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  }

  getSystemLoad(): number {
    return os.loadavg()[0];
  }

  isSystemUnderLoad(cpuThreshold: number = 85, memoryThreshold: number = 80): boolean {
    const cpuUsage = this.getCpuUsage();
    const memoryUsage = this.getMemoryUsage();
    
    return cpuUsage > cpuThreshold || memoryUsage > memoryThreshold;
  }

  getLoadFactor(): number {
    const cpuUsage = this.getCpuUsage() / 100;
    const memoryUsage = this.getMemoryUsage() / 100;
    const systemLoad = Math.min(this.getSystemLoad() / os.cpus().length, 1);
    
    return Math.max(cpuUsage, memoryUsage, systemLoad);
  }

  private startCpuMonitoring(): void {
    setInterval(() => {
      const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
      const currentTime = Date.now();
      const timeDiff = currentTime - this.lastCpuTime;
      
      if (timeDiff > 0) {
        const cpuPercent = ((currentCpuUsage.user + currentCpuUsage.system) / 1000000) / (timeDiff / 1000);
        
        this.cpuUsageHistory.push(cpuPercent * 100);
        
        if (this.cpuUsageHistory.length > this.maxHistoryLength) {
          this.cpuUsageHistory.shift();
        }
      }
      
      this.lastCpuUsage = process.cpuUsage();
      this.lastCpuTime = currentTime;
    }, 1000);
  }

  private getAverageCpuUsage(): number {
    if (this.cpuUsageHistory.length === 0) return 0;
    
    const sum = this.cpuUsageHistory.reduce((acc, val) => acc + val, 0);
    return sum / this.cpuUsageHistory.length;
  }

  private getProcessLoad(): number {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    return (memoryUsage.rss / totalMemory) * 100;
  }
} 