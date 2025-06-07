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
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { LoggingService } from './common/services/logging.service';
import { PerformanceLogger } from './common/utils/performance-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Initialize logging service
  const loggingService = app.get(LoggingService);
  app.useLogger(loggingService);
  PerformanceLogger.initialize(loggingService);

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
  app.useGlobalInterceptors(new LoggingInterceptor(loggingService));

  // Swagger/OpenAPI setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('StarkPulse API')
    .setDescription('API documentation for StarkPulse backend. All secured endpoints require a Bearer JWT token.')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      description: 'Enter JWT token',
      in: 'header',
    }, 'Bearer')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'StarkPulse API Docs',
  });

  await app.listen(port);

  loggingService.log(`Application is running on: http://localhost:${port}/api`);
  loggingService.log(`Environment: ${configService.environment}`);
}

bootstrap();
