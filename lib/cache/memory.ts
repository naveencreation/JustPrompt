import type { Cache } from "./index";

interface Entry<T> {
  value: T;
  expiresAt: number | null;
}

/**
 * In-process LRU-ish cache with TTL eviction.
 * Sufficient for Tier 0 (single Vercel instance, low traffic).
 * Replaced transparently by RedisCache when UPSTASH_REDIS_REST_URL is set.
 */
export class MemoryCache implements Cache {
  private readonly store = new Map<string, Entry<unknown>>();
  private readonly maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  private isExpired(entry: Entry<unknown>): boolean {
    return entry.expiresAt !== null && Date.now() > entry.expiresAt;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key) as Entry<T> | undefined;
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (this.store.size >= this.maxSize) {
      // Evict the first (oldest) key
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string): Promise<number> {
    const current = await this.get<number>(key);
    const next = (current ?? 0) + 1;
    await this.set(key, next);
    return next;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
    const result: string[] = [];
    for (const key of this.store.keys()) {
      const entry = this.store.get(key)!;
      if (!this.isExpired(entry) && regex.test(key)) {
        result.push(key);
      }
    }
    return result;
  }
}
