import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnvConfig } from '../../config/env-config.service';
import { User } from '../../../modules/users/entities/user.entity';

export interface JwtUserPayload {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  avatarUrl: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtAuthStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly envConfig: EnvConfig,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envConfig.jwtConfig.secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUserPayload> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists in database');
    }

    if (user.loggedOut && payload.iat * 1000 < user.loggedOut.getTime()) {
      throw new UnauthorizedException('Token has been revoked due to logout');
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.avatarUrl,
    };
  }
}
