import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '../config/config.service';
import { Session } from './entities/session.entity';
import { Request } from 'express';
import * as crypto from 'crypto';
import { UAParser } from 'ua-parser-js';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Clean expired sessions periodically
    setInterval(() => this.cleanExpiredSessions(), 1000 * 60 * 60); // Run every hour
  }

  /**
   * Create a new session for a user
   */
  async createSession(
    user: User,
    req: Request,
    walletAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Generate device info
    const deviceInfo = this.getDeviceInfo(req);

    // Check if there's an existing active session for this device
    const existingSession = await this.findExistingDeviceSession(
      user.id,
      deviceInfo,
    );

    // If there's an existing session for this device, deactivate it
    if (existingSession) {
      await this.sessionRepository.remove(existingSession);
    }

    // Generate tokens
    const accessTokenPayload = { sub: user.id, username: user.username };
    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: this.configService.sessionConfig.accessTokenExpiresIn || '15m',
    });

    // Create refresh token with longer expiration
    const refreshTokenPayload = {
      sub: user.id,
      tokenId: crypto.randomBytes(16).toString('hex'),
    };
    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: this.configService.sessionConfig.refreshTokenExpiresIn || '7d',
    });

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Create and save session
    const session = this.sessionRepository.create({
      userId: user.id,
      token: refreshToken,
      expiresAt,
      deviceInfo,
      walletAddress,
      lastActiveAt: new Date(),
    });

    await this.sessionRepository.save(session);

    return { accessToken, refreshToken };
  }

  /**
   * Finds an existing active session for the same device
   */
  private async findExistingDeviceSession(
    userId: string,
    deviceInfo: Session['deviceInfo'],
  ): Promise<Session | null> {
    // Find sessions for this user
    const userSessions = await this.sessionRepository.find({
      where: {
        userId,
        isActive: true,
      },
    });

    // Check for matching device fingerprints
    // We'll consider a device match if the browser, OS, and IP address match
    return (
      userSessions.find(
        (session) =>
          session.deviceInfo.browser === deviceInfo.browser &&
          session.deviceInfo.os === deviceInfo.os &&
          session.deviceInfo.ip === deviceInfo.ip,
      ) || null
    );
  }

  /**
   * Refresh the access token using a refresh token
   */
  async refreshToken(
    refreshToken: string,
    req: Request,
  ): Promise<{ accessToken: string }> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken);

      // Find session in database
      const session = await this.sessionRepository.findOne({
        where: { token: refreshToken, isActive: true },
        relations: ['user'],
      });

      if (!session || new Date() > session.expiresAt) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      // Update last active time and device info (in case it changed slightly)
      session.lastActiveAt = new Date();
      session.deviceInfo = this.getDeviceInfo(req);
      await this.sessionRepository.save(session);

      // Generate new access token
      const user = session.user;
      const accessTokenPayload = { sub: user.id, username: user.username };
      const accessToken = this.jwtService.sign(accessTokenPayload, {
        expiresIn:
          this.configService.sessionConfig.accessTokenExpiresIn || '1d',
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<Omit<Session, 'token'>[]> {
    const sessions = await this.sessionRepository.find({
      where: { 
        userId,
        isActive: true 
      },
      order: { lastActiveAt: 'DESC' },
    });
    
    // Remove token from each session for security
    return sessions.map(session => {
      const { token, ...sessionWithoutToken } = session;
      return sessionWithoutToken;
    });
  }

  /**
   * Validate a session by its token
   */
  async validateSession(token: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { token, isActive: true },
      relations: ['user'],
    });

    if (!session || new Date() > session.expiresAt) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    return session;
  }

  /**
   * Revoke a single session
   */
  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    session.isActive = false;
    await this.sessionRepository.save(session);
  }

  /**
   * Revoke all sessions for a user except the current one
   */
  async revokeAllOtherSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<void> {
    await this.sessionRepository.update(
      { userId, id: currentSessionId, isActive: true },
      { isActive: false },
    );
  }

  /**
   * Logout by revoking the current session
   */
  async logout(refreshToken: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { token: refreshToken },
    });

    if (session) {
      session.isActive = false;
      await this.sessionRepository.save(session);
    }
  }

  /**
   * Clean expired sessions from the database
   */
  private async cleanExpiredSessions(): Promise<void> {
    const now = new Date();
    await this.sessionRepository.update(
      { expiresAt: LessThan(now), isActive: true },
      { isActive: false },
    );
  }

  /**
   * Extract device information from request
   */
  private getDeviceInfo(req: Request): Session['deviceInfo'] {
    const userAgent = req.headers['user-agent'] || '';
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();

    return {
      browser: `${browser.name || 'Unknown'} ${browser.version || ''}`.trim(),
      os: `${os.name || 'Unknown'} ${os.version || ''}`.trim(),
      deviceType: device.type || 'desktop',
      deviceName: device.vendor
        ? `${device.vendor} ${device.model || ''}`.trim()
        : 'Unknown device',
      ip: req.ip || req.connection.remoteAddress || '',
      userAgent,
    };
  }

  /**
   * Generate a device fingerprint to uniquely identify a device
   */
  private generateDeviceFingerprint(deviceInfo: Session['deviceInfo']): string {
    const fingerprintData = `${deviceInfo.browser}|${deviceInfo.os}|${deviceInfo.ip}`;
    return crypto.createHash('sha256').update(fingerprintData).digest('hex');
  }
}
