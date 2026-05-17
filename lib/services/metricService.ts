import { cache } from "@/lib/cache/factory";
import { metricRepo } from "@/lib/repos/metricRepo";
import { logger } from "@/lib/observability/logger";
import { config } from "@/lib/config";
import { CACHE_TTL } from "@/lib/constants/cache";
import type { ImageId } from "@/lib/db/schema";

// ─── metricService ──────────────────────────────────────────────────────────
// Business logic for copy and view tracking.
//
// COPIES: Full caching treatment (mirrors likeService).
//   Tier 0 (memory): Writes directly to DB. Cache used as in-process counter only.
//   Tier 1+ (Redis): Increments Redis counter; cron job flushes delta → Postgres.
//
// VIEWS: Fire-and-forget direct write. No cache buffering — simpler is fine
//   because view counts don't need sub-second accuracy.

export const metricService = {
  // ── Copies ────────────────────────────────────────────────────────────────

  async recordCopy(imageId: ImageId): Promise<void> {
    const delta = await cache.incr(`copy:${imageId}`);

    if (delta === 1) {
      // Mark as dirty so the cron job knows to flush this image
      await cache.set(`copy:dirty:${imageId}`, "1", CACHE_TTL.LIKE_DELTA);
    }

    if (config.cache === "memory") {
      // Tier 0: flush immediately — in-memory cache can't survive restarts
      await metricRepo.incrementCopyBy(imageId, 1);
      await cache.del(`copy:${imageId}`);
    }

    logger.info("image.copied", { imageId });
  },

  async getCopyCount(imageId: ImageId): Promise<number> {
    const persisted = await metricRepo.getCopyCount(imageId);
    const delta = (await cache.get<number>(`copy:${imageId}`)) ?? 0;
    return persisted + delta;
  },

  /** Called by the cron job to flush copy deltas → Postgres. No-op on Tier 0. */
  async flushAllCopies(): Promise<void> {
    const dirtyKeys = await cache.keys("copy:dirty:*");
    if (dirtyKeys.length === 0) return;

    for (const dirtyKey of dirtyKeys) {
      const imageId = dirtyKey.replace("copy:dirty:", "") as ImageId;
      const delta = (await cache.get<number>(`copy:${imageId}`)) ?? 0;
      if (delta > 0) {
        await metricRepo.incrementCopyBy(imageId, delta);
        await cache.del(`copy:${imageId}`);
        await cache.del(dirtyKey);
        logger.info("copy.flushed", { imageId, delta });
      }
    }
  },

  async totalCopies(): Promise<number> {
    return metricRepo.totalCopies();
  },

  // ── Views ─────────────────────────────────────────────────────────────────

  /** Direct write — no cache buffer needed for views. */
  async recordView(imageId: ImageId): Promise<void> {
    await metricRepo.incrementViewBy(imageId, 1);
    logger.info("image.viewed", { imageId });
  },

  async totalViews(): Promise<number> {
    return metricRepo.totalViews();
  },
};
