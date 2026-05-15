export interface RateLimit {
  /**
   * Returns true if the request is allowed, false if rate-limited.
   * @param key     unique key (e.g. `like:${ip}:${imageId}`)
   * @param limit   max requests allowed in the window
   * @param windowSec   window duration in seconds
   */
  check(key: string, limit: number, windowSec: number): Promise<boolean>;
}

export { rateLimit } from "./factory";
