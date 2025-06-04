import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  OnModuleDestroy,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '../config/config.service';
import { Session } from './entities/session.entity';
import { SessionActivity } from './entities/activity.entity';
import { Request } from 'express';
import * as crypto from 'crypto';
import { UAParser } from 'ua-parser-js';
import { User } from '../auth/entities/user.entity';

const SESSION_TIMEOUT_MINUTES = 30;
const MAX_CONCURRENT_SESSIONS = 1;

@Injectable()
export class SessionService implements OnModuleDestroy {
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(SessionActivity)
    private activityRepo: Repository<SessionActivity>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.cleanupInterval = setInterval(() => this.cleanExpiredSessions(), 1000 * 60 * 60); // hourly
  }

  async createSession(
    user: User,
    req: Request,
    walletAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const deviceInfo = this.getDeviceInfo(req);

    // Enforce concurrent session limit
    await this.enforceConcurrentSessions(user.id);

    const existingSession = await this.findExistingDeviceSession(user.id, deviceInfo);
    if (existingSession) await this.sessionRepository.remove(existingSession);

    const accessTokenPayload = { sub: user.id, username: user.username };
    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: this.configService.sessionConfig.accessTokenExpiresIn || '15m',
    });

    const refreshTokenPayload = {
      sub: user.id,
      tokenId: crypto.randomBytes(16).toString('hex'),
    };
    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: this.configService.sessionConfig.refreshTokenExpiresIn || '7d',
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = this.sessionRepository.create({
      userId: user.id,
      token: refreshToken,
      expiresAt,
      deviceInfo,
      walletAddress,
      lastActiveAt: new Date(),
      ipAddress: deviceInfo.ip,
      revoked: false,
      isActive: true,
    });

    await this.sessionRepository.save(session);

    return { accessToken, refreshToken };
  }

  private async findExistingDeviceSession(
    userId: string,
    deviceInfo: Session['deviceInfo'],
  ): Promise<Session | null> {
    const userSessions = await this.sessionRepository.find({
      where: { userId, isActive: true, revoked: false },
    });

    return (
      userSessions.find(
        (session) =>
          session.deviceInfo.browser === deviceInfo.browser &&
          session.deviceInfo.os === deviceInfo.os &&
          session.deviceInfo.ip === deviceInfo.ip,
      ) || null
    );
  }

  async refreshToken(refreshToken: string, req: Request): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const session = await this.sessionRepository.findOne({
        where: { token: refreshToken, isActive: true, revoked: false },
        relations: ['user'],
      });

      if (!session || new Date() > session.expiresAt) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      await this.validateSession(session.id); // Validate timeout
      session.lastActiveAt = new Date();
      session.deviceInfo = this.getDeviceInfo(req);
      await this.sessionRepository.save(session);

      const user = session.user;
      const accessTokenPayload = { sub: user.id, username: user.username };
      const accessToken = this.jwtService.sign(accessTokenPayload, {
        expiresIn: this.configService.sessionConfig.accessTokenExpiresIn || '1d',
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getUserSessions(userId: string): Promise<Omit<Session, 'token'>[]> {
    const sessions = await this.sessionRepository.find({
      where: { userId, isActive: true, revoked: false },
      order: { lastActiveAt: 'DESC' },
    });

    return sessions.map(({ token, ...rest }) => rest);
  }

  async validateSession(sessionId: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, isActive: true, revoked: false },
      relations: ['user'],
    });

    if (!session || new Date() > session.expiresAt) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const now = new Date();
    const diffMinutes = (now.getTime() - session.lastActiveAt.getTime()) / 60000;

    if (diffMinutes > SESSION_TIMEOUT_MINUTES) {
      session.revoked = true;
      session.isActive = false;
      await this.sessionRepository.save(session);
      throw new UnauthorizedException('Session timed out');
    }

    session.lastActiveAt = now;
    await this.sessionRepository.save(session);
    return session;
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId, userId } });
    if (!session) throw new BadRequestException('Session not found');

    session.isActive = false;
    session.revoked = true;
    await this.sessionRepository.save(session);
  }

  async revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    await this.sessionRepository.update(
      { userId, isActive: true, revoked: false, id: Not(currentSessionId) },
      { isActive: false, revoked: true },
    );
  }

  async logout(refreshToken: string): Promise<void> {
    const session = await this.sessionRepository.findOne({ where: { token: refreshToken } });
    if (session) {
      session.isActive = false;
      session.revoked = true;
      await this.sessionRepository.save(session);
    }
  }

  private async cleanExpiredSessions(): Promise<void> {
    const now = new Date();
    await this.sessionRepository.update(
      { expiresAt: LessThan(now), isActive: true },
      { isActive: false, revoked: true },
    );
  }

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

  async enforceConcurrentSessions(userId: string): Promise<void> {
    const activeSessions = await this.sessionRepository.find({
      where: { userId, revoked: false, isActive: true },
    });

    if (activeSessions.length >= MAX_CONCURRENT_SESSIONS) {
      for (const session of activeSessions) {
        session.revoked = true;
        session.isActive = false;
        await this.sessionRepository.save(session);
      }
    }
  }

  async trackActivity(sessionId: string, action: string, metadata?: string) {
    const activity = this.activityRepo.create({ sessionId, action, metadata });
    await this.activityRepo.save(activity);
  }

  async detectSuspiciousActivity(userId: string, currentIp: string): Promise<boolean> {
    const recentSessions = await this.sessionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 3,
    });

    const lastIps = recentSessions.map((s) => s.ipAddress);
    const distinctIps = new Set(lastIps);
    return distinctIps.size > 1;
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
