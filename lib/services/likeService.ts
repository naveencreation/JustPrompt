import { cache } from "@/lib/cache/factory";
import { rateLimit } from "@/lib/ratelimit/factory";
import { likeRepo } from "@/lib/repos/likeRepo";
import { logger } from "@/lib/observability/logger";
import { LIKE_RATE_LIMIT } from "@/lib/constants/limits";
import { CACHE_TTL } from "@/lib/constants/cache";
import type { ImageId } from "@/lib/db/schema";

const LIKE_WINDOW_SECONDS = 3600; // 1 hour

export const likeService = {
  async like(imageId: ImageId, ip: string): Promise<{ ok: boolean; count: number }> {
    const allowed = await rateLimit.check(
      `like:${ip}:${imageId}`,
      LIKE_RATE_LIMIT,
      LIKE_WINDOW_SECONDS,
    );

    if (!allowed) {
      return { ok: false, count: await this.getCount(imageId) };
    }

    // Tier 0: directly increment in DB.
    // Tier 1+: cache.incr writes to Redis; cron flushes delta to DB.
    const delta = await cache.incr(`like:${imageId}`);

    // If this is the first in-memory increment, persist the delta key TTL
    if (delta === 1) {
      await cache.set(`like:dirty:${imageId}`, "1", CACHE_TTL.LIKE_DELTA);
    }

    // On Tier 0 (memory cache), flush immediately since memory is per-instance
    if (process.env["UPSTASH_REDIS_REST_URL"] === undefined) {
      await likeRepo.incrementBy(imageId, 1);
      await cache.del(`like:${imageId}`);
    }

    const count = await this.getCount(imageId);
    logger.info("image.liked", { imageId, count });

    return { ok: true, count };
  },

  async getCount(imageId: ImageId): Promise<number> {
    const persisted = await likeRepo.getCount(imageId);
    const delta = (await cache.get<number>(`like:${imageId}`)) ?? 0;
    return persisted + delta;
  },

  /** Called by cron job to flush Redis deltas → Postgres. No-op on Tier 0. */
  async flushAll(): Promise<void> {
    const dirtyKeys = await cache.keys("like:dirty:*");
    if (dirtyKeys.length === 0) return;

    for (const dirtyKey of dirtyKeys) {
      const imageId = dirtyKey.replace("like:dirty:", "") as ImageId;
      const delta = (await cache.get<number>(`like:${imageId}`)) ?? 0;
      if (delta > 0) {
        await likeRepo.incrementBy(imageId, delta);
        await cache.del(`like:${imageId}`);
        await cache.del(dirtyKey);
        logger.info("like.flushed", { imageId, delta });
      }
    }
  },

  async totalLikes(): Promise<number> {
    return likeRepo.totalLikes();
  },
};
