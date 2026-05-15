export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  /** Returns all keys matching a glob pattern (e.g. "like:*") */
  keys(pattern: string): Promise<string[]>;
}

export { cache } from "./factory";
