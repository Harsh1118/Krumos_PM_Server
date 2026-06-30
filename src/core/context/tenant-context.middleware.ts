import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantContextService: TenantContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    this.tenantContextService.run(() => {
      next();
    });
  }
}
