import { config } from "@/lib/config";
import type { Cache } from "./index";

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
    const result = await this.send<string | null>(["GET", key]);
    if (result === null || result === undefined) return null;
    try {
      return JSON.parse(result) as T;
    } catch {
      return result as unknown as T;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const payload = typeof value === "string" ? value : JSON.stringify(value);
    const cmd: (string | number)[] = ["SET", key, payload];
    if (ttlSeconds && ttlSeconds > 0) {
      cmd.push("EX", ttlSeconds);
    }
    await this.send(cmd);
  }

  async del(key: string): Promise<void> {
    await this.send(["DEL", key]);
  }

  async incr(key: string): Promise<number> {
    const result = await this.send<number>(["INCR", key]);
    return Number(result);
  }

  async keys(pattern: string): Promise<string[]> {
    // SCAN is safer than KEYS on large datasets; iterate until cursor returns 0.
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
  }
}
