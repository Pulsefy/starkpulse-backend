import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '../config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.databaseConfig.host,
        port: configService.databaseConfig.port,
        username: configService.databaseConfig.username,
        password: configService.databaseConfig.password,
        database: configService.databaseConfig.database,
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: configService.databaseConfig.synchronize,
        logging: configService.databaseConfig.logging,
        migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
        migrationsRun: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
