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
  Res, // keep this import from main
} from '@nestjs/common';
import { SessionService } from './session.service';
import { Request } from 'express';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * Get all active sessions for the current user
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get all active sessions', description: 'Returns all active sessions for the authenticated user.' })
  @ApiResponse({ status: 200, description: 'List of active sessions', schema: { example: [ { id: 'session-uuid', userId: 'user-uuid', userAgent: 'Mozilla/5.0', ip: '192.168.1.1', createdAt: '2025-06-03T10:00:00.000Z', lastUsedAt: '2025-06-03T12:00:00.000Z' } ] } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getUserSessions(@GetUser() user) {
    return this.sessionService.getUserSessions(user.id);
  }

  /**
   * Refresh access token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token', description: 'Refreshes the access token using a valid refresh token.' })
  @ApiBody({
    description: 'Refresh token payload',
    schema: {
      example: { refreshToken: 'refresh-token-uuid' },
      properties: { refreshToken: { type: 'string', description: 'Refresh token' } },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({ status: 200, description: 'New access and refresh tokens', schema: { example: { accessToken: 'jwt-access-token', refreshToken: 'jwt-refresh-token' } } })
  @ApiResponse({ status: 400, description: 'Refresh token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Revoke a session', description: 'Revokes a specific session by its ID for the authenticated user.' })
  @ApiParam({ name: 'id', description: 'Session ID (UUID)' })
  @ApiResponse({ status: 204, description: 'Session revoked successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async revokeSession(@Param('id') id: string, @GetUser() user) {
    await this.sessionService.revokeSession(id, user.id);
  }

  /**
   * Revoke all other sessions except the current one
   */
  @UseGuards(JwtAuthGuard)
  @Delete('revoke-others/:currentSessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke all other sessions', description: 'Revokes all sessions for the authenticated user except the current session.' })
  @ApiParam({ name: 'currentSessionId', description: 'Current session ID (UUID) to keep active' })
  @ApiResponse({ status: 204, description: 'Other sessions revoked successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Logout', description: 'Revokes the current session using the provided refresh token.' })
  @ApiBody({
    description: 'Refresh token payload',
    schema: {
      example: { refreshToken: 'refresh-token-uuid' },
      properties: { refreshToken: { type: 'string', description: 'Refresh token' } },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  @ApiResponse({ status: 400, description: 'Refresh token is required' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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