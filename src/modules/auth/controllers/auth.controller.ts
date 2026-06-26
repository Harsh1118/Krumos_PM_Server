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
import * as express from 'express';
import { EnvConfig } from '../../../core/config/env-config.service';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';

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

      this.setRefreshTokenCookie(res, refreshToken);

      const frontendUrl = this.envConfig.appConfig.frontendUrl;
      return res.redirect(
        `${frontendUrl}/auth/callback?token=${accessToken}&user=${encodeURIComponent(JSON.stringify(user))}`,
      );
    } catch {
      const frontendUrl = this.envConfig.appConfig.frontendUrl;
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }

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
