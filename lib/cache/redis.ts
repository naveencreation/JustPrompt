import type { Cache } from "./index";

/**
 * Tier 1 upgrade path — Upstash Redis.
 *
 * This file is a stub. To activate:
 *   1. `pnpm add @upstash/redis`
 *   2. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in env.
 *   3. Implement the methods below using `Redis.fromEnv()` from `@upstash/redis`.
 *
 * The factory at `lib/cache/factory.ts` only loads this module when
 * `config.cache === "redis"`, so the stub is safe to ship.
 */
export class RedisCache implements Cache {
  constructor() {
    throw new Error(
      "RedisCache is not implemented yet. Install @upstash/redis and complete the implementation in lib/cache/redis.ts before setting UPSTASH_REDIS_REST_URL.",
    );
  }

  async get<T>(_key: string): Promise<T | null> {
    throw new Error("RedisCache.get not implemented");
  }
  async set<T>(_key: string, _value: T, _ttlSeconds?: number): Promise<void> {
    throw new Error("RedisCache.set not implemented");
  }
  async del(_key: string): Promise<void> {
    throw new Error("RedisCache.del not implemented");
  }
  async incr(_key: string): Promise<number> {
    throw new Error("RedisCache.incr not implemented");
  }
  async keys(_pattern: string): Promise<string[]> {
    throw new Error("RedisCache.keys not implemented");
  }
}
