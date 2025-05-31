import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { Request } from 'express';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * Get all active sessions for the current user
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserSessions(@GetUser() user) {
    return this.sessionService.getUserSessions(user.id);
  }

  /**
   * Refresh access token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Req() req: Request) {
    const refreshToken = req.body?.refreshToken;

    if (!refreshToken) {
      return { message: 'Refresh token is required' };
    }

    return this.sessionService.refreshToken(refreshToken, req);
  }

  /**
   * Revoke a specific session owned by the user
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(@Param('id') id: string, @GetUser() user) {
    await this.sessionService.revokeSession(id, user.id);
  }

  /**
   * Revoke all other sessions except the current one
   */
  @UseGuards(JwtAuthGuard)
  @Delete('revoke-others/:currentSessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeAllOtherSessions(
    @Param('currentSessionId') currentSessionId: string,
    @GetUser() user,
  ) {
    await this.sessionService.revokeAllOtherSessions(user.id, currentSessionId);
  }

  /**
   * Logout - revoke the current session
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request) {
    const refreshToken = req.body?.refreshToken;

    if (refreshToken) {
      await this.sessionService.logout(refreshToken);
    }

    return;
  }

  /**
   * Revoke a session by ID (authenticated user only)
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/revoke')
  async revoke(@Param('id') id: string, @GetUser() user) {
    await this.sessionService.revokeSession(id, user.id);
    return { message: 'Session revoked successfully' };
  }
}
