import type { RateLimit } from "./index";

/**
 * Tier 1 upgrade path — Upstash Redis sliding-window rate limit.
 *
 * Stub. To activate:
 *   1. `pnpm add @upstash/ratelimit @upstash/redis`
 *   2. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
 *   3. Implement using `Ratelimit.slidingWindow(limit, `${windowSec} s`)`.
 *
 * The factory at `lib/ratelimit/factory.ts` only loads this module when
 * `config.rateLimit === "redis"`.
 */
export class RedisRateLimit implements RateLimit {
  constructor() {
    throw new Error(
      "RedisRateLimit is not implemented yet. Install @upstash/ratelimit and complete the implementation in lib/ratelimit/redis.ts before setting UPSTASH_REDIS_REST_URL.",
    );
  }

  async check(_key: string, _limit: number, _windowSec: number): Promise<boolean> {
    throw new Error("RedisRateLimit.check not implemented");
  }
}
