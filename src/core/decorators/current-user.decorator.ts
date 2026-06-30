import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../modules/users/entities/user.entity';

export interface RequestWithUser {
  user?: User;
}

export const CurrentUser = createParamDecorator(
  (data: null | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
