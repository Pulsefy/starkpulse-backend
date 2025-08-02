import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIndexes1703000000000 implements MigrationInterface {
  name = 'CreateIndexes1703000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create performance indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
      ON users(email) WHERE email IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_created 
      ON users(is_active, created_at) WHERE is_active = true;
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role 
      ON users(role) WHERE role IS NOT NULL;
    `);

    // Composite indexes for common queries
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_status 
      ON orders(user_id, status, created_at);
    `);

    // Partial indexes for better performance
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_pending 
      ON orders(created_at) WHERE status = 'pending';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_users_email;');
    await queryRunner.query('DROP INDEX IF EXISTS idx_users_active_created;');
    await queryRunner.query('DROP INDEX IF EXISTS idx_users_role;');
    await queryRunner.query('DROP INDEX IF EXISTS idx_orders_user_status;');
    await queryRunner.query('DROP INDEX IF EXISTS idx_orders_pending;');
  }
}
