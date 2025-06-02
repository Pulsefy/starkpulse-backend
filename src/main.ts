// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MarketGateway } from './market/market.gateway';
import { MarketService } from './market/market.service';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { RateLimitLoggingInterceptor } from './common/interceptors/rate-limit-logging.interceptor';
import { AppConfig } from './config';


async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  const marketGateway = app.get(MarketGateway);
  const marketService = app.get(MarketService);

  marketService.simulateDataStream((data) => {
    marketGateway.broadcastMarketUpdate(data);
  });

  const configService = app.get(ConfigService);  app.setGlobalPrefix('api');
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.use(helmet());

  (app as any).set?.('trust proxy', 1);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: configService.get('environment') === 'production',
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalInterceptors(app.get(RateLimitLoggingInterceptor));

  app.enableCors({
    origin: typeof configService.get('corsOrigins' as keyof AppConfig) === 'string'
      ? (configService.get('corsOrigins' as keyof AppConfig) as string).split(',')
      : ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('API with Rate Limiting')
    .setDescription('API with comprehensive rate limiting implementation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Rate Limiting', 'Rate limiting endpoints and configuration')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get('port' as keyof AppConfig) || 3000;

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  const rateLimitConfig = configService.get('rateLimit' as keyof AppConfig) as any;
  logger.log(`🛡️ Rate limiting is enabled with ${rateLimitConfig?.store?.type} store`);
}

bootstrap();
