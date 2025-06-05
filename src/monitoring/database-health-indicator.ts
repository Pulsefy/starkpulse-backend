import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      const isConnected = this.connection.isConnected;
      if (!isConnected) {
        throw new Error('Database is not connected');
      }

      // Test query execution
      await this.connection.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;

      // Test connection pool (if applicable)
      const poolStats = await this.getConnectionPoolStats();

      // Determine health status
      const isHealthy = responseTime < 2000; // 2 seconds threshold
      const result = this.getStatus(key, isHealthy, {
        status: isHealthy ? 'up' : 'degraded',
        responseTime,
        connected: isConnected,
        pool: poolStats,
        timestamp: new Date().toISOString(),
      });

      if (!isHealthy) {
        throw new HealthCheckError('Database response time is too high', result);
      }

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result = this.getStatus(key, false, {
        status: 'down',
        responseTime,
        connected: this.connection.isConnected,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      throw new HealthCheckError('Database health check failed', result);
    }
  }

  private async getConnectionPoolStats(): Promise<{
    active: number;
    idle: number;
    total: number;
  }> {
    try {
      // This is a simplified version - actual implementation depends on your connection pool
      // For TypeORM with PostgreSQL, you might query pg_stat_activity
      const poolQuery = `
        SELECT 
          count(CASE WHEN state = 'active' THEN 1 END) as active,
          count(CASE WHEN state = 'idle' THEN 1 END) as idle,
          count(*) as total
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;

      const result = await this.connection.query(poolQuery);
      return {
        active: parseInt(result[0]?.active || '0'),
        idle: parseInt(result[0]?.idle || '0'),
        total: parseInt(result[0]?.total || '0'),
      };
    } catch (error) {
      // Fallback if we can't get pool stats
      return {
        active: this.connection.isConnected ? 1 : 0,
        idle: 0,
        total: 1,
      };
    }
  }

  async checkDatabaseSize(): Promise<HealthIndicatorResult> {
    const key = 'database_size';
    
    try {
      const sizeQuery = `
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as size,
          pg_database_size(current_database()) as size_bytes
      `;
      
      const result = await this.connection.query(sizeQuery);
      const sizeBytes = parseInt(result[0]?.size_bytes || '0');
      const sizeGB = sizeBytes / (1024 * 1024 * 1024);

      // Check if database size is reasonable (customize threshold as needed)
      const isHealthy = sizeGB < 10; // 10GB threshold
      
      return this.getStatus(key, isHealthy, {
        size: result[0]?.size,
        sizeBytes,
        sizeGB: Math.round(sizeGB * 100) / 100,
        threshold: '10GB',
        status: isHealthy ? 'ok' : 'warning',
      });
    } catch (error) {
      throw new HealthCheckError('Database size check failed', 
        this.getStatus(key, false, { error: error.message })
      );
    }
  }

  async checkTableStats(): Promise<HealthIndicatorResult> {
    const key = 'database_tables';
    
    try {
      const tablesQuery = `
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
        LIMIT 10
      `;
      
      const tables = await this.connection.query(tablesQuery);
      
      // Check for tables with high dead tuple ratio
      const problematicTables = tables.filter(table => {
        const deadRatio = table.dead_tuples / (table.live_tuples + table.dead_tuples || 1);
        return deadRatio > 0.1; // 10% dead tuples threshold
      });

      const isHealthy = problematicTables.length === 0;
      
      return this.getStatus(key, isHealthy, {
        totalTables: tables.length,
        problematicTables: problematicTables.length,
        tables: tables.slice(0, 5), // Return top 5 tables
        needsVacuum: problematicTables.map(t => t.tablename),
      });
    } catch (error) {
      throw new HealthCheckError('Database table stats check failed',
        this.getStatus(key, false, { error: error.message })
      );
    }
  }

  async checkLockStatus(): Promise<HealthIndicatorResult> {
    const key = 'database_locks';
    
    try {
      const locksQuery = `
        SELECT 
          mode,
          COUNT(*) as count
        FROM pg_locks 
        WHERE granted = true
        GROUP BY mode
        ORDER BY count DESC
      `;
      
      const locks = await this.connection.query(locksQuery);
      const totalLocks = locks.reduce((sum, lock) => sum + parseInt(lock.count), 0);
      
      // Check for excessive locks (customize threshold as needed)
      const isHealthy = totalLocks < 100;
      
      return this.getStatus(key, isHealthy, {
        totalLocks,
        lockTypes: locks,
        threshold: 100,
        status: isHealthy ? 'ok' : 'warning',
      });
    } catch (error) {
      throw new HealthCheckError('Database locks check failed',
        this.getStatus(key, false, { error: error.message })
      );
    }
  }

  async performComprehensiveCheck(): Promise<{
    connectivity: HealthIndicatorResult;
    size: HealthIndicatorResult;
    tables: HealthIndicatorResult;
    locks: HealthIndicatorResult;
  }> {
    const [connectivity, size, tables, locks] = await Promise.allSettled([
      this.isHealthy('database_connectivity'),
      this.checkDatabaseSize(),
      this.checkTableStats(),
      this.checkLockStatus(),
    ]);

    return {
      connectivity: connectivity.status === 'fulfilled' ? connectivity.value : 
        this.getStatus('database_connectivity', false, { error: 'Check failed' }),
      size: size.status === 'fulfilled' ? size.value :
        this.getStatus('database_size', false, { error: 'Check failed' }),
      tables: tables.status === 'fulfilled' ? tables.value :
        this.getStatus('database_tables', false, { error: 'Check failed' }),
      locks: locks.status === 'fulfilled' ? locks.value :
        this.getStatus('database_locks', false, { error: 'Check failed' }),
    };
  }
}