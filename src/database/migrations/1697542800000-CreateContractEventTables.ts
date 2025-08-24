import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContractEventTables1697542800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create contracts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        address TEXT NOT NULL UNIQUE,
        name TEXT,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        abi JSONB,
        monitored_events TEXT[],
        last_synced_block INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create contract_events table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contract_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        description TEXT,
        data JSONB NOT NULL,
        block_number INTEGER,
        block_hash TEXT,
        transaction_hash TEXT,
        sequence INTEGER,
        is_processed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE
      );
    `);

    // Create indexes for faster queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contract_events_contract_id ON contract_events(contract_id);
      CREATE INDEX IF NOT EXISTS idx_contract_events_name ON contract_events(name);
      CREATE INDEX IF NOT EXISTS idx_contract_events_block_number ON contract_events(block_number);
      CREATE INDEX IF NOT EXISTS idx_contract_events_is_processed ON contract_events(is_processed);
      CREATE INDEX IF NOT EXISTS idx_contracts_address ON contracts(address);
      CREATE INDEX IF NOT EXISTS idx_contracts_is_active ON contracts(is_active);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`
      DROP TABLE IF EXISTS contract_events;
      DROP TABLE IF EXISTS contracts;
    `);
  }
}
