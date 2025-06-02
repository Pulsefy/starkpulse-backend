// src/main.ts
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ValidationPipe } from './common/pipes/validation.pipe';
import * as cookieParser from 'cookie-parser';
import { MarketGateway } from './market/market.gateway';
import { MarketService } from './market/market.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  const marketGateway = app.get(MarketGateway);
  const marketService = app.get(MarketService);

  marketService.simulateDataStream((data) => {
    marketGateway.broadcastMarketUpdate(data);
  });

  // Get application configuration
  const configService = app.get(ConfigService);
  const port = configService.port;

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS for frontend
  app.enableCors();

  // Use cookie-parser middleware for handling cookies
  app.use(cookieParser());

  // Global validation pipes
  app.useGlobalPipes(new ValidationPipe());

  // Global filters for exception handling
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/api`);
  logger.log(`Environment: ${configService.environment}`);
}

bootstrap();
