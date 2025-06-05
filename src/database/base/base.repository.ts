import { Repository, SelectQueryBuilder, FindManyOptions } from 'typeorm';
import { QueryCacheService } from '../services/query-cache.service';

export abstract class BaseRepository<T> {
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly cacheService: QueryCacheService,
  ) {}

  // Optimized find with caching
  async findWithCache(
    options?: FindManyOptions<T>,
    cacheKey?: string,
    ttl = 600,
  ): Promise<T[]> {
    const key =
      cacheKey ||
      `find:${this.repository.metadata.name}:${JSON.stringify(options)}`;

    let result = await this.cacheService.get<T[]>(key);

    if (!result) {
      result = await this.repository.find(options);
      await this.cacheService.set(key, result, ttl);
    }

    return result;
  }

  // Optimized pagination
  async findPaginated(
    page: number,
    limit: number,
    options?: FindManyOptions<T>,
  ): Promise<{ data: T[]; total: number; pages: number }> {
    const [data, total] = await this.repository.findAndCount({
      ...options,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  // Optimized query builder with automatic caching
  createOptimizedQueryBuilder(alias: string): SelectQueryBuilder<T> {
    return this.repository.createQueryBuilder(alias).cache(true); // Enable query-level caching
  }

  // Bulk operations
  async bulkCreate(entities: Partial<T>[], chunkSize = 1000): Promise<void> {
    for (let i = 0; i < entities.length; i += chunkSize) {
      const chunk = entities.slice(i, i + chunkSize);
      await this.repository
        .createQueryBuilder()
        .insert()
        .values(chunk)
        .execute();
    }
  }

  async bulkUpdate(criteria: any, updateData: Partial<T>): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update()
      .set(updateData)
      .where(criteria)
      .execute();
  }

  // Invalidate related cache
  async invalidateCache(patterns: string[]): Promise<void> {
    await this.cacheService.invalidateByTags(patterns);
  }
}
