import { CanActivate, ExecutionContext, Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Request } from 'express';

// NoSQL injection pattern
const noSqlInjectionPattern = /\$(ne|eq|gt|gte|lt|lte|in|nin|or|and|not|nor|exists|type|expr|jsonSchema|mod|regex|text|where|geoWithin|geoIntersects|near|nearSphere|all|elemMatch|size|bitsAllSet|bitsAnySet|bitsAllClear|bitsAnyClear)/i;
// XSS pattern (simple)
const xssPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

@Injectable()
export class InjectionPreventionGuard implements CanActivate {
  private readonly logger = new Logger(InjectionPreventionGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    const suspicious = [
      ...this.detectNoSQLInjection(request.body, ['body']),
      ...this.detectNoSQLInjection(request.query, ['query']),
      ...this.detectNoSQLInjection(request.params, ['params']),
      ...this.detectXSS(request.body, ['body']),
      ...this.detectXSS(request.query, ['query']),
      ...this.detectXSS(request.params, ['params']),
    ];
    if (suspicious.length > 0) {
      this.logger.warn(`Injection/XSS attempt detected: ${JSON.stringify(suspicious)}`);
      throw new BadRequestException({
        message: 'Potential NoSQL injection or XSS attack detected',
        details: suspicious,
      });
    }
    return true;
  }

  private detectNoSQLInjection(obj: any, path: string[] = []): Array<{ path: string; value: any; type: string }> {
    const suspicious: Array<{ path: string; value: any; type: string }> = [];
    if (typeof obj === 'string') {
      if (noSqlInjectionPattern.test(obj)) {
        suspicious.push({ path: path.join('.'), value: obj, type: 'NoSQL' });
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        suspicious.push(...this.detectNoSQLInjection(obj[key], [...path, key]));
      }
    }
    return suspicious;
  }

  private detectXSS(obj: any, path: string[] = []): Array<{ path: string; value: any; type: string }> {
    const suspicious: Array<{ path: string; value: any; type: string }> = [];
    if (typeof obj === 'string') {
      if (xssPattern.test(obj)) {
        suspicious.push({ path: path.join('.'), value: obj, type: 'XSS' });
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        suspicious.push(...this.detectXSS(obj[key], [...path, key]));
      }
    }
    return suspicious;
  }
} 