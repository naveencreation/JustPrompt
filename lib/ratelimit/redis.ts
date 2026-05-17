import { config } from "@/lib/config";
import type { RateLimit } from "./index";

/**
 * Sliding-window rate limit implemented over Upstash Redis sorted sets.
 *
 * For each key we keep a ZSET of timestamps; on every check we:
 *   1. Remove members older than (now - window).
 *   2. Count remaining members.
 *   3. If count < limit, add the current timestamp and allow.
 *
 * No SDK dependency — same direct-REST pattern as RedisCache.
 */
export class RedisRateLimit implements RateLimit {
  private readonly url: string;
  private readonly token: string;

  constructor() {
    const url = config.redis.url;
    const token = config.redis.token;
    if (!url || !token) {
      throw new Error(
        "RedisRateLimit requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to be set.",
      );
    }
    this.url = url.replace(/\/+$/, "");
    this.token = token;
  }

  private async pipeline(commands: (string | number)[][]): Promise<unknown[]> {
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Upstash Redis error ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as Array<{ result?: unknown; error?: string }>;
    return json.map((entry) => {
      if (entry.error) throw new Error(`Upstash Redis: ${entry.error}`);
      return entry.result;
    });
  }

  async check(key: string, limit: number, windowSec: number): Promise<boolean> {
    const now = Date.now();
    const windowMs = windowSec * 1000;
    const minScore = now - windowMs;
    const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;

    const [, countRaw] = await this.pipeline([
      ["ZREMRANGEBYSCORE", key, 0, minScore],
      ["ZCARD", key],
    ]);

    const count = Number(countRaw ?? 0);
    if (count >= limit) return false;

    await this.pipeline([
      ["ZADD", key, now, member],
      ["EXPIRE", key, windowSec],
    ]);
    return true;
  }
}
