import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EnvConfig } from '../../../core/config/env-config.service';
import { GoogleAuthStrategy } from '../../../core/strategies/auth/google-auth.strategy';
import * as crypto from 'crypto';
import { User } from '../../users/entities/user.entity';
import { UsersRepository } from '../../users/repositories/users.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly envConfig: EnvConfig,
    private readonly googleAuthStrategy: GoogleAuthStrategy,
  ) {}

  getGoogleAuthUrl(): string {
    const { clientId, redirectUri } = this.envConfig.googleOauthConfig;
    return `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=openid%20email%20profile&prompt=select_account`;
  }

  async authenticateWithGoogleCode(
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const user = await this.googleAuthStrategy.authenticateWithCode(code);
    const { accessToken, refreshToken } = await this.generateTokens(user);
    return { accessToken, refreshToken, user };
  }

  async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };

    // Access Token has 15m expiration
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    // Refresh Token has 7d expiration
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    user.refreshTokenHash = refreshTokenHash;
    await this.userRepository.save(user);

    return { accessToken, refreshToken };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const user = await this.userRepository.findOne({
      where: { refreshTokenHash: hash },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokens = await this.generateTokens(user);
    return { ...tokens, user };
  }

  async validateUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async recordLogout(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.loggedOut = new Date();
      user.refreshTokenHash = null;
      await this.userRepository.save(user);
    }
  }
}
