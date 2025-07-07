import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiVersioningGuard implements CanActivate {
  private readonly logger = new Logger(ApiVersioningGuard.name);
  private readonly DEPRECATED_VERSIONS = ['v1', 'v1.0'];
  private readonly CURRENT_VERSION_PREFIX = '/v2/';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const requestedVersion = request.headers['x-api-version'] as string;
    const url = request.originalUrl;

    if (
      requestedVersion &&
      this.DEPRECATED_VERSIONS.includes(requestedVersion.toLowerCase())
    ) {
      this.logger.warn(
        `API Versioning Guard: Deprecated API version '${requestedVersion}' requested for URL: ${url}`,
      );
      throw new BadRequestException(
        `API version '${requestedVersion}' is deprecated. Please upgrade to a newer version.`,
      );
    }

    if (!url.startsWith(this.CURRENT_VERSION_PREFIX) && !this.isExempt(url)) {
      this.logger.warn(
        `API Versioning Guard: Invalid API version in URL for ${url}. Expected prefix: ${this.CURRENT_VERSION_PREFIX}`,
      );
      throw new BadRequestException(
        `Invalid API version. Please use '${this.CURRENT_VERSION_PREFIX}' prefix in the URL.`,
      );
    }

    this.logger.log(
      `API Versioning Guard: Request for version '${requestedVersion || 'N/A'}' (URL: ${url}) allowed.`,
    );
    return true;
  }

  private isExempt(url: string): boolean {
    return url.startsWith('/health') || url.startsWith('/public');
  }
}
