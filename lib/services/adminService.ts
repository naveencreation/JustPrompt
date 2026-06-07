import { revalidateTag as _revalidateTag } from "next/cache";
import { imageRepo } from "@/lib/repos/imageRepo";
import { likeRepo } from "@/lib/repos/likeRepo";
import { metricRepo } from "@/lib/repos/metricRepo";
import { searchLogRepo } from "@/lib/repos/searchLogRepo";
import { settingsRepo } from "@/lib/repos/settingsRepo";
import { likeService } from "./likeService";
import { metricService } from "./metricService";
import { logger } from "@/lib/observability/logger";
import { CACHE_TAG } from "@/lib/constants/cache";
import type { Image, ImageId, Settings } from "@/lib/db/schema";

// Next.js 15 types require a second `profile` argument that we don't use.
const revalidateTag = _revalidateTag as (tag: string) => void;

// ─── Dashboard Stats Types ──────────────────────────────────────────────────

export interface TopCopiedEntry {
  image: Image;
  copyCount: number;
  likeCount: number;
}

export interface DashboardStats {
  // Scorecard numbers
  totalImages: number;
  totalLikes: number;
  totalCopies: number;
  totalViews: number;
  copyRate: number; // percentage: (copies / views) * 100

  // Content performance
  recentImages: Image[];
  mostLiked: Image | null;
  topCopied: TopCopiedEntry[];

  // Search intelligence
  topSearches: { query: string; count: number }[];
  failedSearches: { query: string; count: number }[];
}

// ─── adminService ───────────────────────────────────────────────────────────

export const adminService = {
  async getDashboardStats(): Promise<DashboardStats> {
    // All queries fire in parallel — dashboard loads in single round-trip latency.
    const [
      totalImages,
      totalLikes,
      totalCopies,
      totalViews,
      recentImages,
      copiedRows,
      topSearches,
      failedSearches,
      mostLikedImageId,
    ] = await Promise.all([
      imageRepo.count(),
      likeService.totalLikes(),
      metricService.totalCopies(),
      metricService.totalViews(),
      imageRepo.listAll({ limit: 5 }),
      metricRepo.topCopied(10),
      searchLogRepo.getTopQueries(5),
      searchLogRepo.getZeroResultQueries(5),
      settingsRepo.getMostLikedImageId(),
    ]);

    // Copy rate: what % of page views result in a copy?
    const copyRate =
      totalViews > 0 ? Math.round((totalCopies / totalViews) * 100) : 0;

    const mostLiked = mostLikedImageId
      ? await imageRepo.findById(mostLikedImageId)
      : null;

    // Hydrate top-copied rows with full image data + their like counts
    const topCopied: TopCopiedEntry[] = [];
    for (const row of copiedRows) {
      const image = await imageRepo.findById(row.imageId);
      if (!image) continue;
      const likeCount = await likeRepo.getCount(row.imageId);
      topCopied.push({ image, copyCount: row.count, likeCount });
    }

    return {
      totalImages,
      totalLikes,
      totalCopies,
      totalViews,
      copyRate,
      recentImages,
      mostLiked,
      topCopied,
      topSearches,
      failedSearches,
    };
  },

  async getSettings(): Promise<Settings | null> {
    return settingsRepo.getSettings();
  },

  async setFeaturedImage(imageId: ImageId | null): Promise<void> {
    await settingsRepo.setFeaturedImage(imageId);
    revalidateTag(CACHE_TAG.GALLERY);
    revalidateTag(CACHE_TAG.SETTINGS);
    logger.info("settings.featured_image_set", { imageId });
  },

  async toggleMaintenanceMode(enabled: boolean): Promise<void> {
    await settingsRepo.setMaintenanceMode(enabled);
    revalidateTag(CACHE_TAG.SETTINGS);
    logger.info("settings.maintenance_mode_toggled", { enabled });
  },

  async flushLikes(): Promise<void> {
    await likeService.flushAll();
    logger.info("cron.likes_flushed");
  },
};
