import { FindOneOptions, FindManyOptions, FindOptionsWhere } from 'typeorm';

export function applyTenantFilter<T>(
  options: FindManyOptions<T> | FindOneOptions<T>,
  workspaceId: string | undefined,
): void {
  if (!workspaceId) return;

  if (!options.where) {
    options.where = { workspaceId } as unknown as FindOptionsWhere<T>;
  } else if (Array.isArray(options.where)) {
    options.where = options.where.map((condition) => ({
      ...condition,
      workspaceId,
    }));
  } else {
    options.where = {
      ...(options.where as unknown as Record<string, unknown>),
      workspaceId,
    } as unknown as FindOptionsWhere<T>;
  }
}
