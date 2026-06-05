import { config } from "@/lib/config";
import type { Cache } from "./index";
import { errors } from "@/lib/observability/errors";

/**
 * Upstash Redis cache, talking to the REST API directly via fetch.
 * No SDK dependency — keeps the bundle small and matches the pattern
 * used by `lib/storage/cloudinary.ts`.
 *
 * Activated when UPSTASH_REDIS_REST_URL / TOKEN are present.
 */
export class RedisCache implements Cache {
  private readonly url: string;
  private readonly token: string;

  constructor() {
    const url = config.redis.url;
    const token = config.redis.token;
    if (!url || !token) {
      throw new Error(
        "RedisCache requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to be set.",
      );
    }
    this.url = url.replace(/\/+$/, "");
    this.token = token;
  }

  private async send<T = unknown>(command: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Upstash Redis error ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as { result?: T; error?: string };
    if (json.error) throw new Error(`Upstash Redis: ${json.error}`);
    return json.result as T;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const payload = await this.send<string | null>(["GET", key]);
      if (payload === null || payload === undefined) return null;
      return JSON.parse(payload) as T;
    } catch (err) {
      errors.capture(err, { op: "redis.get", key });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const payload = typeof value === "string" ? value : JSON.stringify(value);
      const cmd: (string | number)[] = ["SET", key, payload];
      if (ttlSeconds && ttlSeconds > 0) {
        cmd.push("EX", ttlSeconds);
      }
      await this.send(cmd);
    } catch (err) {
      errors.capture(err, { op: "redis.set", key });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.send(["DEL", key]);
    } catch (err) {
      errors.capture(err, { op: "redis.del", key });
    }
  }

  async incr(key: string): Promise<number> {
    try {
      const nextVal = await this.send<number>(["INCR", key]);
      return Number(nextVal);
    } catch (err) {
      errors.capture(err, { op: "redis.incr", key });
      return 0;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const keys: string[] = [];
      let cursor: string = "0";
      let firstPass = true;
      while (firstPass || cursor !== "0") {
        firstPass = false;
        const res: [string, string[]] = await this.send<[string, string[]]>([
          "SCAN",
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100,
        ]);
        cursor = String(res[0]);
        keys.push(...res[1]);
      }
      return keys;
    } catch (err) {
      errors.capture(err, { op: "redis.keys", pattern });
      return [];
    }
  }
}
