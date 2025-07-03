import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner, SelectQueryBuilder } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getConnectionPoolStatus() {
    const driver = this.dataSource.driver as any;
    return {
      active: driver.master?.totalCount || 0,
      idle: driver.master?.idleCount || 0,
      waiting: driver.master?.waitingCount || 0,
    };
  }

  async createOptimizedQueryRunner(): Promise<QueryRunner> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    return queryRunner;
  }

  async executeWithTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    const queryRunner = await this.createOptimizedQueryRunner();
    
    try {
      await queryRunner.startTransaction();
      const result = await operation(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Transaction failed', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Executes a parameterized query safely. Throws if parameters are not used.
   * @param query SQL query string with placeholders
   * @param parameters Parameters to bind
   */
  async safeQuery(query: string, parameters: any[] = []): Promise<any> {
    if (!Array.isArray(parameters) || parameters.length === 0) {
      this.logger.warn('Attempted to execute a query without parameters. This is discouraged for security reasons.');
      throw new Error('Unparameterized queries are not allowed. Use parameterized queries to prevent SQL injection.');
    }
    return this.dataSource.query(query, parameters);
  }

  // Optimized bulk operations
  async bulkInsert<T>(
    entity: any,
    data: Partial<T>[],
    chunkSize = 1000,
  ): Promise<void> {
    const repository = this.dataSource.getRepository(entity);
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      // All values are parameterized by TypeORM's query builder
      await repository
        .createQueryBuilder()
        .insert()
        .into(entity)
        .values(chunk)
        .orIgnore() // or orUpdate for upsert
        .execute();
    }
  }

  async bulkUpdate<T>(
    entity: any,
    updates: { condition: any; data: Partial<T> }[],
  ): Promise<void> {
    const queryRunner = await this.createOptimizedQueryRunner();
    try {
      await queryRunner.startTransaction();
      for (const update of updates) {
        // All values are parameterized by TypeORM's query builder
        await queryRunner.manager
          .createQueryBuilder()
          .update(entity)
          .set(update.data)
          .where(update.condition)
          .execute();
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
