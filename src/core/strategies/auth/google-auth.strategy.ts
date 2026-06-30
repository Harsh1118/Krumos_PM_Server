import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnvConfig } from '../../config/env-config.service';
import { User } from '../../../modules/users/entities/user.entity';
import axios from 'axios';

@Injectable()
export class GoogleAuthStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly envConfig: EnvConfig,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      clientID: envConfig.googleOauthConfig.clientId,
      clientSecret: envConfig.googleOauthConfig.clientSecret,
      callbackURL: envConfig.googleOauthConfig.redirectUri,
      scope: ['email', 'profile'],
    });
  }

  // Used by the Passport AuthGuard for automatic GET callback exchange
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id, emails, displayName, photos } = profile;
      const email = emails?.[0]?.value;
      const picture = photos?.[0]?.value || '';

      if (!email) {
        return done(
          new UnauthorizedException('Email not returned by Google OAuth'),
          false,
        );
      }

      const user = await this.findOrCreateUser(email, displayName, picture, id);
      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }

  // Used for manual POST code exchange (if the frontend passes the authorization code directly)
  async authenticateWithCode(code: string): Promise<User> {
    const { clientId, clientSecret, redirectUri } =
      this.envConfig.googleOauthConfig;

    try {
      // 1. Exchange code for access token
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token } = tokenResponse.data;

      // 2. Fetch user profile information using the access token
      const profileResponse = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      );

      const { sub, email, name, picture } = profileResponse.data;

      if (!email) {
        throw new UnauthorizedException('Email not returned by Google OAuth');
      }

      return await this.findOrCreateUser(email, name, picture, sub);
    } catch (error) {
      console.error(
        'Google OAuth Manual Authentication Strategy Error:',
        error.response?.data || error.message,
      );
      throw new UnauthorizedException(
        'Failed to authenticate with Google OAuth',
      );
    }
  }

  // Helper method to consolidate database synchronization logic
  private async findOrCreateUser(
    email: string,
    name: string,
    picture: string,
    googleId: string,
  ): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    const now = new Date();
    if (!user) {
      user = this.userRepository.create({
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        avatarUrl: picture || '',
        googleId: googleId || null,
        loginAt: now,
      });
      user = await this.userRepository.save(user);
    } else {
      let updated = false;
      if (name && user.name !== name) {
        user.name = name;
        updated = true;
      }
      if (picture && user.avatarUrl !== picture) {
        user.avatarUrl = picture;
        updated = true;
      }
      if (googleId && user.googleId !== googleId) {
        user.googleId = googleId;
        updated = true;
      }
      user.loginAt = now;
      updated = true;

      if (updated) {
        user = await this.userRepository.save(user);
      }
    }
    return user;
  }
}
