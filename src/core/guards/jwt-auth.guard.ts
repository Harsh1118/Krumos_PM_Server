import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = any>(
    err: unknown,
    user: TUser,
    info: unknown,
  ): TUser {
    if (err || !user) {
      const infoError = info as Error | undefined;
      if (infoError?.message === 'No auth token') {
        throw new UnauthorizedException('Authorization header is missing');
      }
      throw (
        (err as Error) ||
        new UnauthorizedException('Invalid or expired authentication token')
      );
    }
    return user;
  }
}
