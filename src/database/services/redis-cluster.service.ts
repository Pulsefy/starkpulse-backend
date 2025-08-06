import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cluster } from 'ioredis';
import { CacheAnalyticsService } from './cache-analytics.service';

export interface ClusterNode {
  host: string;
  port: number;
}

export interface ClusterHealth {
  totalNodes: number;
  healthyNodes: number;
  unhealthyNodes: number;
  clusterState: string;
  masterNodes: number;
  slaveNodes: number;
}

@Injectable()
export class RedisClusterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisClusterService.name);
  private cluster: Cluster;
  private isClusterEnabled: boolean;
  private healthCheckInterval: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheAnalytics: CacheAnalyticsService,
  ) {
    this.isClusterEnabled = this.configService.get(
      'REDIS_CLUSTER_ENABLED',
      false,
    );
  }

  async onModuleInit() {
    if (this.isClusterEnabled) {
      await this.initializeCluster();
      this.startHealthMonitoring();
    }
  }

  async onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.cluster) {
      await this.cluster.disconnect();
    }
  }

  private async initializeCluster(): Promise<void> {
    try {
      const nodes = this.getClusterNodes();

      this.cluster = new Cluster(nodes, {
        enableReadyCheck: false,
        redisOptions: {
          password: this.configService.get('REDIS_PASSWORD'),
          connectTimeout: 10000,
          commandTimeout: 5000,
          maxRetriesPerRequest: 3,
        },
        scaleReads: 'slave',
        maxRedirections: 16,
        retryDelayOnFailover: 100,
        enableOfflineQueue: false,
        lazyConnect: true,
      });

      this.cluster.on('connect', () => {
        this.logger.log('Redis cluster connected successfully');
      });

      this.cluster.on('ready', () => {
        this.logger.log('Redis cluster is ready');
      });

      this.cluster.on('error', (error) => {
        this.logger.error('Redis cluster error:', error);
        this.cacheAnalytics.recordError('cluster_error', error.message);
      });

      this.cluster.on('close', () => {
        this.logger.warn('Redis cluster connection closed');
      });

      this.cluster.on('reconnecting', () => {
        this.logger.log('Redis cluster reconnecting...');
      });

      this.cluster.on('end', () => {
        this.logger.warn('Redis cluster connection ended');
      });

      this.cluster.on('+node', (node) => {
        this.logger.log(
          `New node added to cluster: ${node.options.host}:${node.options.port}`,
        );
      });

      this.cluster.on('-node', (node) => {
        this.logger.warn(
          `Node removed from cluster: ${node.options.host}:${node.options.port}`,
        );
      });

      this.cluster.on('node error', (error, node) => {
        this.logger.error(
          `Node error on ${node.options.host}:${node.options.port}:`,
          error,
        );
      });

      await this.cluster.connect();
    } catch (error) {
      this.logger.error('Failed to initialize Redis cluster:', error);
      throw error;
    }
  }

  private getClusterNodes(): ClusterNode[] {
    const nodesString = this.configService.get(
      'REDIS_CLUSTER_NODES',
      'localhost:7000,localhost:7001,localhost:7002',
    );
    return nodesString.split(',').map((node) => {
      const [host, port] = node.split(':');
      return { host, port: Number.parseInt(port) };
    });
  }

  private startHealthMonitoring(): void {
    const interval = this.configService.get(
      'REDIS_HEALTH_CHECK_INTERVAL',
      30000,
    ); // 30 seconds

    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getClusterHealth();
        this.cacheAnalytics.recordClusterHealth(health);

        if (health.unhealthyNodes > 0) {
          this.logger.warn(
            `Cluster health warning: ${health.unhealthyNodes} unhealthy nodes`,
          );
        }
      } catch (error) {
        this.logger.error('Health check failed:', error);
      }
    }, interval);
  }

  async getClusterHealth(): Promise<ClusterHealth> {
    if (!this.cluster) {
      throw new Error('Cluster not initialized');
    }

    try {
      const nodes = this.cluster.nodes();
      const infoNode = this.cluster.nodes('all')[0];

      const clusterInfoRaw: string = await infoNode.call('cluster', 'info');

      const stateLine = clusterInfoRaw
        .split('\n')
        .find((line) => line.startsWith('cluster_state:'));

      const clusterState = stateLine
        ? stateLine.split(':')[1].trim()
        : 'unknown';

      let healthyNodes = 0;
      let masterNodes = 0;
      let slaveNodes = 0;

      for (const node of nodes) {
        try {
          await node.ping();
          healthyNodes++;

          const info: string = await node.info('replication');
          if (info.includes('role:master')) {
            masterNodes++;
          } else if (info.includes('role:slave')) {
            slaveNodes++;
          }
        } catch {
          // unhealthy node; continue
        }
      }

      return {
        totalNodes: nodes.length,
        healthyNodes,
        unhealthyNodes: nodes.length - healthyNodes,
        clusterState,
        masterNodes,
        slaveNodes,
      };
    } catch (error) {
      this.logger.error('Failed to get cluster health:', error);
      throw error;
    }
  }

  async executeCommand(command: string, ...args: any[]): Promise<any> {
    if (!this.cluster) {
      throw new Error('Cluster not initialized');
    }

    try {
      const startTime = Date.now();
      const result = await this.cluster.call(command, ...args);
      const duration = Date.now() - startTime;

      this.cacheAnalytics.recordOperation(command, duration, true);
      return result;
    } catch (error) {
      this.cacheAnalytics.recordOperation(command, 0, false);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    return this.executeCommand('get', key);
  }

  async set(key: string, value: string, ttl?: number): Promise<string> {
    if (ttl) {
      return this.executeCommand('setex', key, ttl, value);
    }
    return this.executeCommand('set', key, value);
  }

  async del(key: string): Promise<number> {
    return this.executeCommand('del', key);
  }

  async exists(key: string): Promise<number> {
    return this.executeCommand('exists', key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.executeCommand('keys', pattern);
  }

  async flushall(): Promise<string> {
    return this.executeCommand('flushall');
  }

  getCluster(): Cluster | null {
    return this.cluster;
  }

  isClusterMode(): boolean {
    return this.isClusterEnabled;
  }
}
