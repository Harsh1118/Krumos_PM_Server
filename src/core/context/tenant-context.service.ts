import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  workspaceId?: string;
}

@Injectable()
export class TenantContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<TenantStore>();

  run(callback: () => void) {
    this.asyncLocalStorage.run({}, callback);
  }

  setWorkspaceId(workspaceId: string) {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.workspaceId = workspaceId;
    }
  }

  getWorkspaceId(): string | undefined {
    return this.asyncLocalStorage.getStore()?.workspaceId;
  }
}
