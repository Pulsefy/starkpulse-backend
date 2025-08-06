import {
  Injectable,
  NestMiddleware,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestEncryptionService } from '../services/request-encryption.service';

@Injectable()
export class ApiSecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ApiSecurityMiddleware.name);

  constructor(private readonly encryptionService: RequestEncryptionService) {}

  use(req: Request, res: Response, next: NextFunction) {
    this.logger.log(
      `API Security Middleware active for ${req.method} ${req.originalUrl}`,
    );

    if (req.body && Object.keys(req.body).length > 0) {
      const encryptedBody = req.body.encryptedData;
      if (encryptedBody) {
        try {
          const decryptedBody = this.encryptionService.decrypt(encryptedBody);
          req.body = JSON.parse(decryptedBody);
          this.logger.debug('Request body decrypted successfully.');
        } catch (error) {
          this.logger.error(`Failed to decrypt request body: ${error.message}`);
          throw new BadRequestException('Invalid encrypted request body.');
        }
      }
    }

    const originalSend = res.send;
    res.send = (body: any): Response<any, Record<string, any>> => {
      if (body) {
        try {
          const encryptedResponse = this.encryptionService.encrypt(
            body.toString(),
          );
          res.setHeader('Content-Type', 'application/json');
          return originalSend.call(
            res,
            JSON.stringify({ encryptedData: encryptedResponse }),
          );
        } catch (error) {
          this.logger.error(
            `Failed to encrypt response body: ${error.message}`,
          );
          return originalSend.call(
            res,
            JSON.stringify({ error: 'Failed to encrypt response.' }),
          );
        }
      }
      return originalSend.call(res, body);
    };

    next();
  }
}
