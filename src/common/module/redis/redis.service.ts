import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';
@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') readonly client: RedisClientType) {}

  async set(
    key: string,
    value: string,
    expirationInSeconds?: number,
  ): Promise<void> {
    if (expirationInSeconds) {
      await this.client.set(key, value, {
        EX: expirationInSeconds,
      });
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async delete(key: string): Promise<number> {
    return this.client.del(key);
  }

  async deletePattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      return this.client.del(keys);
    }
    return 0;
  }

  // Set a value in a hash map
  async hset(hash: string, field: string, value: string): Promise<number> {
    return this.client.hSet(hash, field, value);
  }

  // Get a value from a hash map
  async hget(hash: string, field: string): Promise<string | undefined> {
    return this.client.hGet(hash, field);
  }

  // Delete a field from a hash map
  async hdel(hash: string, field: string): Promise<number> {
    return this.client.hDel(hash, field);
  }

  // Get all fields and values from a hash map
  async hgetall(hash: string): Promise<Record<string, string>> {
    return this.client.hGetAll(hash);
  }

  // Check if a field exists in a hash map
  async hexists(hash: string, field: string): Promise<boolean> {
    return this.client.hExists(hash, field);
  }

  // Get all field names in a hash map
  async hkeys(hash: string): Promise<string[]> {
    return this.client.hKeys(hash);
  }

  // Get all values in a hash map
  async hvals(hash: string): Promise<string[]> {
    return this.client.hVals(hash);
  }

  // Increment a numeric field in a hash map
  async hincrby(
    hash: string,
    field: string,
    increment: number,
  ): Promise<number> {
    return this.client.hIncrBy(hash, field, increment);
  }

  // Delete an entire hash map
  async delHash(hash: string): Promise<number> {
    return this.client.del(hash);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }
}
