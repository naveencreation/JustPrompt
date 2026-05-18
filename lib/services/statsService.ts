/**
 * Public-surface statistics — used by the gallery hero KPI strip.
 *
 * Cached for 5 minutes (`CACHE_TTL.PUBLIC_STATS`). The numbers are facts about
 * the *catalog*, not the user's session, so a few minutes of drift is fine.
 * On Tier 0 the cache is in-process; on Tier 1+ it's shared via Redis.
 */
import { cache } from "@/lib/cache/factory";
import { imageRepo } from "@/lib/repos/imageRepo";
import { tagRepo } from "@/lib/repos/tagRepo";
import { likeRepo } from "@/lib/repos/likeRepo";
import { CACHE_TTL } from "@/lib/constants/cache";

const PUBLIC_STATS_KEY = "stats:public";

export interface PublicStats {
  totalImages: number;
  totalTags: number;
  totalLikes: number;
}

export const statsService = {
  async getPublicStats(): Promise<PublicStats> {
    const cached = await cache.get<PublicStats>(PUBLIC_STATS_KEY);
    if (cached) return cached;

    const [totalImages, totalTags, totalLikes] = await Promise.all([
      imageRepo.count(),
      tagRepo.count(),
      likeRepo.totalLikes(),
    ]);

    const stats: PublicStats = { totalImages, totalTags, totalLikes };
    await cache.set(PUBLIC_STATS_KEY, stats, CACHE_TTL.PUBLIC_STATS);
    return stats;
  },
};
