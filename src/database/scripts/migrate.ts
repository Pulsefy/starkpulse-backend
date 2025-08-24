import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';

import { DataSource } from 'typeorm';

async function runMigrations() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    console.log('Running migrations...');
    await dataSource.runMigrations();
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runMigrations();
