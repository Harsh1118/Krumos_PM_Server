import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import * as express from 'express';
import * as crypto from 'crypto';
import { EnvConfig } from '../../../core/config/env-config.service';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';

// Short-lived in-memory store for one-time OAuth state codes.
// Each entry maps a random code → { accessToken, refreshToken, user } and
// expires after TOKEN_EXCHANGE_TTL_MS to prevent stale codes accumulating.
const TOKEN_EXCHANGE_TTL_MS = 60_000; // 60 seconds
const pendingOAuthTokens = new Map<string, {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresAt: number;
}>();

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly envConfig: EnvConfig,
  ) {}

  private setRefreshTokenCookie(res: express.Response, token: string) {
    const isDev = !this.envConfig.appConfig.isProduction;
    res.cookie('krumos_refresh_token', token, {
      httpOnly: true,
      secure: !isDev,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth',
    });
  }

  @Get('google/url')
  getGoogleUrl() {
    return { url: this.authService.getGoogleAuthUrl() };
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallbackGet(@Req() req: any, @Res() res: express.Response) {
    try {
      const user = req.user;
      const { accessToken, refreshToken } = await this.authService.generateTokens(user);

      // Store the tokens behind a short-lived one-time state code.
      // The raw access token is NEVER placed in the redirect URL to prevent
      // exposure in browser history, proxy logs, and Referer headers.
      const stateCode = crypto.randomBytes(32).toString('hex');
      pendingOAuthTokens.set(stateCode, {
        accessToken,
        refreshToken,
        user,
        expiresAt: Date.now() + TOKEN_EXCHANGE_TTL_MS,
      });

      const frontendUrl = this.envConfig.appConfig.frontendUrl;
      return res.redirect(`${frontendUrl}/auth/callback?code=${stateCode}`);
    } catch {
      const frontendUrl = this.envConfig.appConfig.frontendUrl;
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('google/exchange')
  @HttpCode(HttpStatus.OK)
  async exchangeOAuthCode(
    @Body('code') code: string,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    if (!code) {
      throw new UnauthorizedException('Authorization code is missing');
    }

    const pending = pendingOAuthTokens.get(code);
    if (!pending) {
      throw new UnauthorizedException('Invalid or expired authorization code');
    }

    // Enforce expiry before consuming the code
    if (Date.now() > pending.expiresAt) {
      pendingOAuthTokens.delete(code);
      throw new UnauthorizedException('Authorization code has expired. Please sign in again.');
    }

    // Consume the code immediately — one-time use only
    pendingOAuthTokens.delete(code);

    this.setRefreshTokenCookie(res, pending.refreshToken);
    return { token: pending.accessToken, user: pending.user };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('google/callback')
  @HttpCode(HttpStatus.OK)
  async googleCallback(
    @Body('code') code: string,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.authenticateWithGoogleCode(code);

    this.setRefreshTokenCookie(res, refreshToken);

    return { token: accessToken, user };
  }

  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const refreshToken = (req as any).cookies?.['krumos_refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    try {
      const { accessToken, refreshToken: newRefreshToken, user } =
        await this.authService.refreshTokens(refreshToken);

      this.setRefreshTokenCookie(res, newRefreshToken);

      return { token: accessToken, user };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    await this.authService.recordLogout(user.id);
    res.clearCookie('krumos_refresh_token', {
      path: '/api/auth',
    });
    return { success: true };
  }
}
