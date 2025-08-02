import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Logger } from '@nestjs/common';

@Injectable()
export class CsrfTokenService {
  private readonly logger = new Logger(CsrfTokenService.name);
  private readonly tokenLength = 32; // 256 bits

  /**
   * Generates a secure random CSRF token
   * @returns A secure random token as a hex string
   */
  generateToken(): string {
    try {
      return randomBytes(this.tokenLength).toString('hex');
    } catch (error) {
      this.logger.error(`Failed to generate CSRF token: ${error.message}`);
      throw new Error('Failed to generate secure token');
    }
  }

  /**
   * Validates that a token matches the expected value
   * @param token The token to validate
   * @param expectedToken The expected token value
   * @returns True if the tokens match, false otherwise
   */
  validateToken(token: string, expectedToken: string): boolean {
    if (!token || !expectedToken) {
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    return this.constantTimeCompare(token, expectedToken);
  }

  /**
   * Performs a constant-time comparison of two strings
   * This prevents timing attacks that could be used to guess the token
   * @param a First string
   * @param b Second string
   * @returns True if strings match, false otherwise
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}
