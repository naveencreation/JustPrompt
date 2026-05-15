import type { RateLimit } from "./index";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * In-process sliding-window token bucket.
 * Best-effort at Tier 0 (resets across instances / restarts).
 * Replaced by RedisRateLimit when UPSTASH_REDIS_REST_URL is set.
 */
export class MemoryRateLimit implements RateLimit {
  private readonly buckets = new Map<string, Bucket>();

  async check(key: string, limit: number, windowSec: number): Promise<boolean> {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowSec * 1000 };
    }

    if (bucket.count >= limit) {
      this.buckets.set(key, bucket);
      return false;
    }

    bucket.count += 1;
    this.buckets.set(key, bucket);
    return true;
  }
}
