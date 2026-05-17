import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/db/client";
import { imageRepo } from "@/lib/repos/imageRepo";
import { likeRepo } from "@/lib/repos/likeRepo";
import { metricRepo } from "@/lib/repos/metricRepo";
import { searchLogRepo } from "@/lib/repos/searchLogRepo";
import { likeService } from "./likeService";
import { metricService } from "./metricService";
import { logger } from "@/lib/observability/logger";
import { CACHE_TAG } from "@/lib/constants/cache";
import type { Image, ImageId, Settings } from "@/lib/db/schema";

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
    ] = await Promise.all([
      imageRepo.count(),
      likeRepo.totalLikes(),
      metricService.totalCopies(),
      metricService.totalViews(),
      imageRepo.listAll({ limit: 5 }),
      metricRepo.topCopied(10),
      searchLogRepo.getTopQueries(10),
      searchLogRepo.getZeroResultQueries(10),
    ]);

    // Copy rate: what % of page views result in a copy?
    const copyRate =
      totalViews > 0 ? Math.round((totalCopies / totalViews) * 100) : 0;

    // Most liked image
    const supabase = createAdminClient();
    const { data: likesData } = await supabase
      .from("like_counts")
      .select("image_id, count")
      .order("count", { ascending: false })
      .limit(1);

    let mostLiked: Image | null = null;
    if (likesData && likesData.length > 0) {
      mostLiked = await imageRepo.findById(
        (likesData[0] as { image_id: ImageId }).image_id,
      );
    }

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
    const supabase = createAdminClient();
    const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
    return data as Settings | null;
  },

  async setFeaturedImage(imageId: ImageId | null): Promise<void> {
    const supabase = createAdminClient();
    await supabase
      .from("settings")
      .update({ featured_image_id: imageId })
      .eq("id", 1);

    revalidateTag(CACHE_TAG.GALLERY, {});
    revalidateTag(CACHE_TAG.SETTINGS, {});
    logger.info("settings.featured_image_set", { imageId });
  },

  async toggleMaintenanceMode(enabled: boolean): Promise<void> {
    const supabase = createAdminClient();
    await supabase
      .from("settings")
      .update({ maintenance_mode: enabled })
      .eq("id", 1);

    revalidateTag(CACHE_TAG.SETTINGS, {});
    logger.info("settings.maintenance_mode_toggled", { enabled });
  },

  async flushLikes(): Promise<void> {
    await likeService.flushAll();
    logger.info("cron.likes_flushed");
  },
};
