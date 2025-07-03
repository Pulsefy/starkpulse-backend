import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Logger } from '@nestjs/common';

// Simple XSS sanitization (for demonstration; use a robust library in production)
function sanitizeXSS(value: any): any {
  if (typeof value === 'string') {
    return value.replace(/<.*?>/g, '');
  } else if (typeof value === 'object' && value !== null) {
    for (const key in value) {
      value[key] = sanitizeXSS(value[key]);
    }
  }
  return value;
}

// SQL/NoSQL injection patterns
const sqlInjectionPattern = /(\b(union|select|insert|update|delete|drop|create|alter)\b.*\b(from|where|order|group)\b)|('.*'.*=.*')|(\d+.*=.*\d+)/i;
const noSqlInjectionPattern = /\$(ne|eq|gt|gte|lt|lte|in|nin|or|and|not|nor|exists|type|expr|jsonSchema|mod|regex|text|where|geoWithin|geoIntersects|near|nearSphere|all|elemMatch|size|bitsAllSet|bitsAnySet|bitsAllClear|bitsAnyClear)/i;

@Injectable()
export class AdvancedValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(AdvancedValidationPipe.name);

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Sanitize input for XSS
    const sanitizedValue = sanitizeXSS({ ...value });

    // Detect SQL/NoSQL injection
    const suspicious = this.detectInjection(sanitizedValue);
    if (suspicious.length > 0) {
      this.logger.warn(`Injection attempt detected: ${JSON.stringify(suspicious)}`);
      throw new BadRequestException({
        message: 'Potential injection attack detected',
        details: suspicious,
      });
    }

    const object = plainToInstance(metatype, sanitizedValue);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      const formattedErrors = errors.map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints)
          : ['Invalid value'];
        return {
          property: error.property,
          errors: constraints,
        };
      });

      this.logger.warn(`Validation failed: ${JSON.stringify(formattedErrors)}`);
      throw new BadRequestException({
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    return object;
  }

  private toValidate(metatype: any): boolean {
    const types: any[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private detectInjection(obj: any, path: string[] = []): Array<{ path: string; value: any; type: string }> {
    const suspicious: Array<{ path: string; value: any; type: string }> = [];
    if (typeof obj === 'string') {
      if (sqlInjectionPattern.test(obj)) {
        suspicious.push({ path: path.join('.'), value: obj, type: 'SQL' });
      }
      if (noSqlInjectionPattern.test(obj)) {
        suspicious.push({ path: path.join('.'), value: obj, type: 'NoSQL' });
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        suspicious.push(...this.detectInjection(obj[key], [...path, key]));
      }
    }
    return suspicious;
  }
} 