import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Provider, hash, ec, encode, number } from 'starknet';
import { ConfigService } from '../../config/config.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class WalletAuthService {
  private nonceStore: Map<string, { nonce: string; timestamp: number }> =
    new Map();
  private readonly NONCE_EXPIRATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ATTEMPTS = 3;
  private attemptCounter: Map<string, { count: number; lastAttempt: number }> =
    new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

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
    // Rate limiting
    const attempts = this.attemptCounter.get(address) || {
      count: 0,
      lastAttempt: 0,
    };
    const now = Date.now();

    // Reset attempts if last attempt was more than 15 minutes ago
    if (now - attempts.lastAttempt > 15 * 60 * 1000) {
      attempts.count = 0;
    }

    if (attempts.count >= this.MAX_ATTEMPTS) {
      throw new UnauthorizedException(
        'Too many attempts. Please try again later.',
      );
    }

    // Update attempts
    this.attemptCounter.set(address, {
      count: attempts.count + 1,
      lastAttempt: now,
    });

    const timestamp = Date.now();
    const message = `StarkPulse Authentication\nNonce: ${timestamp}\nAddress: ${address}`;
    const messageHash = hash.getSelectorFromName(message);

    // Store nonce with timestamp
    this.nonceStore.set(address, {
      nonce: messageHash.toString(),
      timestamp,
    });

    return messageHash.toString();
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
    // Check if nonce exists and hasn't expired
    const storedNonce = this.nonceStore.get(address);
    if (!storedNonce || storedNonce.nonce !== nonce) {
      throw new UnauthorizedException('Invalid or expired nonce');
    }

    if (Date.now() - storedNonce.timestamp > this.NONCE_EXPIRATION) {
      this.nonceStore.delete(address);
      throw new UnauthorizedException('Nonce has expired');
    }

    try {
      const provider = new Provider({
        sequencer: {
          baseUrl: this.configService.starknetConfig.providerUrl,
        },
      });

      // Convert the nonce to a message hash
      const message = `StarkPulse Authentication\nAddress: ${address}\nNonce: ${nonce}`;
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
        this.nonceStore.delete(address);
        this.attemptCounter.delete(address);
      }

      return Boolean(isValid);
    } catch (error) {
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
