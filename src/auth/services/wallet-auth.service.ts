import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Provider, hash, ec, encode, number } from 'starknet';
import { ConfigService } from '../../config/config.service';
import { UsersService } from '../../users/users.service';
import { RedisService } from '../../common/module/redis/redis.service';
import { LoggingService } from '../../common/services/logging.service';
import { SecurityAuditService } from '../../common/security/services/security-audit.service';
import { SecurityEventType, SecurityEventSeverity } from '../../common/security/entities/security-event.entity';
import * as crypto from 'crypto';

@Injectable()
export class WalletAuthService {
  private readonly NONCE_EXPIRATION = 5 * 60 * 1000; // 5 minutes
  private readonly RATE_LIMIT_EXPIRATION = 15 * 60 * 1000; // 15 minutes
  private readonly BLACKLIST_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours (1 day)
  private readonly MAX_ATTEMPTS = 3;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
    private readonly loggingService: LoggingService,
    private readonly securityAuditService: SecurityAuditService,
  ) {
    this.loggingService.setContext('WalletAuthService');
  }

  /**
   * Checks if Argent X wallet is available in the browser
   * @returns boolean indicating if Argent X is available
   */
  async isArgentXAvailable(): Promise<boolean> {
    try {
      // @ts-ignore - starknet.js types don't include wallet detection
      return window.starknet?.version && (await window.starknet.isConnected());
    } catch {
      return false;
    }
  }

  /**
   * Connects to Argent X wallet
   * @returns Connected wallet address
   * @throws UnauthorizedException if Argent X is not available or connection fails
   */
  async connectArgentX(): Promise<string> {
    try {
      if (!(await this.isArgentXAvailable())) {
        throw new UnauthorizedException('Argent X wallet not detected');
      }

      // @ts-ignore - starknet.js types don't include wallet connection
      const walletAccount = await window.starknet.enable();
      if (!walletAccount || !walletAccount.length) {
        throw new UnauthorizedException('Failed to connect to Argent X wallet');
      }

      return walletAccount[0];
    } catch (error) {
      throw new UnauthorizedException(
        error.message || 'Failed to connect to wallet',
      );
    }
  }

  /**
   * Generates a unique nonce for wallet signature
   * @param address StarkNet wallet address
   * @returns Generated nonce
   */
  async generateNonce(address: string): Promise<string> {
    // Rate limiting using Redis
    const rateLimitKey = `rate-limit:nonce:${address}`;
    const attemptsData = await this.redisService.get(rateLimitKey);
    let attempts = attemptsData ? JSON.parse(attemptsData) : { count: 0, lastAttempt: 0 };
    const now = Date.now();

    // Reset attempts if last attempt was more than 15 minutes ago
    if (now - attempts.lastAttempt > this.RATE_LIMIT_EXPIRATION) {
      attempts = { count: 0, lastAttempt: 0 };
    }

    if (attempts.count >= this.MAX_ATTEMPTS) {
      this.loggingService.warn(`Rate limit exceeded for wallet address: ${address}`, { attempts: attempts.count });
      await this.securityAuditService.logSecurityEvent(
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        { metadata: { walletAddress: address, attempts: attempts.count } },
        SecurityEventSeverity.MEDIUM
      );
      throw new UnauthorizedException('Too many attempts. Please try again later.');
    }

    // Update attempts in Redis
    attempts = { count: attempts.count + 1, lastAttempt: now };
    await this.redisService.set(rateLimitKey, JSON.stringify(attempts), this.RATE_LIMIT_EXPIRATION / 1000);

    // Generate a cryptographically secure nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();

    // Store nonce with timestamp in Redis
    const nonceKey = `nonce:${address}:${nonce}`;
    await this.redisService.set(nonceKey, JSON.stringify({ nonce, timestamp }), this.NONCE_EXPIRATION / 1000);

    this.loggingService.log(`Generated nonce for wallet address: ${address}`, { nonce, timestamp });

    return nonce;
  }

  /**
   * Verifies a StarkNet signature
   * @param address Wallet address
   * @param signature Signature to verify
   * @param nonce Nonce used for signing
   * @returns boolean indicating if signature is valid
   */
  async verifySignature(
    address: string,
    signature: string[],
    nonce: string,
  ): Promise<boolean> {
    // Check if nonce is blacklisted
    const blacklistKey = `blacklist:nonce:${address}:${nonce}`;
    const isBlacklisted = await this.redisService.get(blacklistKey);
    if (isBlacklisted) {
      this.loggingService.warn(`Attempt to reuse blacklisted nonce for wallet address: ${address}`, { nonce });
      await this.securityAuditService.logSecurityEvent(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        { metadata: { walletAddress: address, nonce, issue: 'Nonce reused' } },
        SecurityEventSeverity.HIGH
      );
      throw new UnauthorizedException('Nonce has already been used');
    }

    // Check if nonce exists in Redis
    const nonceKey = `nonce:${address}:${nonce}`;
    const storedNonceData = await this.redisService.get(nonceKey);
    if (!storedNonceData) {
      this.loggingService.warn(`Invalid or expired nonce for wallet address: ${address}`, { nonce });
      await this.securityAuditService.logSecurityEvent(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        { metadata: { walletAddress: address, nonce, issue: 'Nonce invalid or expired' } },
        SecurityEventSeverity.MEDIUM
      );
      throw new UnauthorizedException('Invalid or expired nonce');
    }

    const storedNonce = JSON.parse(storedNonceData);
    if (storedNonce.nonce !== nonce) {
      this.loggingService.warn(`Invalid nonce value for wallet address: ${address}`, { nonce, storedNonce: storedNonce.nonce });
      await this.securityAuditService.logSecurityEvent(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        { metadata: { walletAddress: address, nonce, storedNonce: storedNonce.nonce, issue: 'Nonce mismatch' } },
        SecurityEventSeverity.MEDIUM
      );
      throw new UnauthorizedException('Invalid nonce');
    }

    try {
      const provider = new Provider({
        sequencer: {
          baseUrl: this.configService.starknetConfig.providerUrl,
        },
      });

      // Convert the nonce to a message hash
      const message = `StarkPulse Authentication
Address: ${address}
Nonce: ${nonce}`;
      const messageHashBytes = hash.getSelectorFromName(message);
      const messageHash = encode.addHexPrefix(number.toHex(messageHashBytes));

      // Convert signature components to hex strings
      const [r, s] = signature.map((sig) =>
        encode.addHexPrefix(number.toHex(sig)),
      );

      // Verify the signature
      const isValid = await provider.callContract({
        contractAddress: address,
        entrypoint: 'isValidSignature',
        calldata: [messageHash, r, s],
      });

      if (isValid) {
        // Blacklist the nonce after successful verification
        await this.redisService.set(blacklistKey, 'true', this.BLACKLIST_EXPIRATION / 1000);
        // Remove the nonce from active storage
        await this.redisService.delete(nonceKey);
        // Reset rate limit counter
        const rateLimitKey = `rate-limit:nonce:${address}`;
        await this.redisService.delete(rateLimitKey);
        this.loggingService.log(`Successful signature verification for wallet address: ${address}`, { nonce });
      } else {
        this.loggingService.warn(`Signature verification failed for wallet address: ${address}`, { nonce });
        await this.securityAuditService.logSecurityEvent(
          SecurityEventType.LOGIN_FAILURE,
          { metadata: { walletAddress: address, nonce, issue: 'Invalid signature' } },
          SecurityEventSeverity.HIGH
        );
      }

      return Boolean(isValid);
    } catch (error) {
      this.loggingService.error(`Signature verification error for wallet address: ${address}`, error, { nonce });
      await this.securityAuditService.logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        { metadata: { walletAddress: address, nonce, error: error.message, issue: 'Signature verification error' } },
        SecurityEventSeverity.CRITICAL
      );
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Generates JWT tokens for authenticated wallet
   * @param address Wallet address
   * @returns Access and refresh tokens
   */
  async generateTokens(address: string) {
    // Find or create user profile
    let user = await this.usersService.findByWalletAddress(address);
    if (!user) {
      user = await this.usersService.create({
        walletAddress: address,
        username: `stark_${address.slice(2, 10)}`,
      });
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: user.id,
          wallet: address,
          type: 'access',
        },
        {
          expiresIn: '1h',
          secret: this.configService.jwtSecret,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: user.id,
          wallet: address,
          type: 'refresh',
        },
        {
          expiresIn: '7d',
          secret: this.configService.jwtRefreshSecret,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  /**
   * Validates a JWT token
   * @param token JWT token to validate
   * @returns Decoded token payload if valid
   */
  async validateToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.jwtSecret,
      });
      return payload;
    } catch {
      return null;
    }
  }
}
