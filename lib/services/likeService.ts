import { cache } from "@/lib/cache/factory";
import { rateLimit } from "@/lib/ratelimit/factory";
import { likeRepo } from "@/lib/repos/likeRepo";
import { logger } from "@/lib/observability/logger";
import { config } from "@/lib/config";
import { LIKE_RATE_LIMIT } from "@/lib/constants/limits";
import { CACHE_TTL } from "@/lib/constants/cache";
import { TIMING } from "@/lib/constants/timing";
import type { ImageId } from "@/lib/db/schema";

export const likeService = {
  async like(imageId: ImageId, ip: string): Promise<{ ok: boolean; count: number }> {
    const allowed = await rateLimit.check(
      `like:${ip}:${imageId}`,
      LIKE_RATE_LIMIT,
      TIMING.LIKE_WINDOW_SECONDS,
    );

    if (!allowed) {
      return { ok: false, count: await this.getCount(imageId) };
    }

    // Tier 0: directly increment in DB (memory cache is per-instance, can't be trusted across replicas).
    // Tier 1+: cache.incr writes to Redis; cron flushes delta to DB.
    const delta = await cache.incr(`like:${imageId}`);

    if (delta === 1) {
      await cache.set(`like:dirty:${imageId}`, "1", CACHE_TTL.LIKE_DELTA);
    }

    if (config.cache === "memory") {
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

  /** Called by the cron job to flush deltas → Postgres. No-op on Tier 0. */
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
