import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
  HttpException,
} from '@nestjs/common';
import { ApiSigningGuard } from './guards/api-signing.guard';
import { ApiAbuseDetectionService } from './services/api-abuse-detection.service';
import { RequestEncryptionService } from './services/request-encryption.service';
import { ApiVersioningGuard } from './guards/api-versioning.guard';
import { IsString, IsNotEmpty } from 'class-validator';
import { Request } from 'express';
import { RateLimitGuard } from 'src/common/guards/rate-limit.guard';

class TestDataDto {
  @IsNotEmpty()
  @IsString()
  message: string;
}

@Controller('v2/api-security')
export class ApiSecurityController {
  private readonly logger = new Logger(ApiSecurityController.name);

  constructor(
    private readonly abuseDetectionService: ApiAbuseDetectionService,
    private readonly encryptionService: RequestEncryptionService,
  ) {}

  @Post('signed-data')
  @UseGuards(ApiVersioningGuard, ApiSigningGuard, RateLimitGuard)
  @HttpCode(HttpStatus.OK)
  getSignedData(@Body() body: TestDataDto): {
    status: string;
    receivedMessage: string;
  } {
    this.logger.log('Received request on signed-data endpoint.');
    const abuseCheck = this.abuseDetectionService.analyzeRequest(body.message);
    if (abuseCheck.isAbusive) {
      this.abuseDetectionService.recordFailedAttempt(body.message);
      throw new HttpException(
        `Abusive request detected: ${abuseCheck.reason}`,
        HttpStatus.FORBIDDEN,
      );
    }
    return {
      status: 'Signed data received and verified!',
      receivedMessage: body.message,
    };
  }

  @Post('encrypted-data')
  @HttpCode(HttpStatus.OK)
  getEncryptedData(@Body() body: TestDataDto): {
    status: string;
    receivedMessage: string;
  } {
    this.logger.log('Received request on encrypted-data endpoint.');

    return {
      status: 'Encrypted data received and decrypted!',
      receivedMessage: body.message,
    };
  }

  @Get('rate-limited-data')
  @UseGuards(ApiVersioningGuard, RateLimitGuard)
  @HttpCode(HttpStatus.OK)
  getRateLimitedData(): { status: string } {
    this.logger.log('Received request on rate-limited-data endpoint.');
    return { status: 'Rate-limited data accessed successfully!' };
  }

  @Post('simulate-failed-attempt')
  @HttpCode(HttpStatus.OK)
  simulateFailedAttempt(
    @Body() body: TestDataDto,
    @Req() req: Request,
  ): { status: string } {
    this.logger.log('Simulating failed attempt.');
    this.abuseDetectionService.recordFailedAttempt(req.ip || body.message);
    return { status: 'Failed attempt recorded.' };
  }

  @Get('versioned-data')
  @UseGuards(ApiVersioningGuard)
  @HttpCode(HttpStatus.OK)
  getVersionedData(): { status: string; version: string } {
    this.logger.log('Received request on versioned-data endpoint.');
    return { status: 'Versioned data accessed successfully!', version: 'v2' };
  }

  @Get('/public/health')
  @HttpCode(HttpStatus.OK)
  getHealth(): { status: string } {
    this.logger.log('Health check endpoint accessed.');
    return { status: 'OK' };
  }
}
