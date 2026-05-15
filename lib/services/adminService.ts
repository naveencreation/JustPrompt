import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/db/client";
import { imageRepo } from "@/lib/repos/imageRepo";
import { likeRepo } from "@/lib/repos/likeRepo";
import { likeService } from "./likeService";
import { logger } from "@/lib/observability/logger";
import { CACHE_TAG } from "@/lib/constants/cache";
import type { Image, ImageId, Settings } from "@/lib/db/schema";

export const adminService = {
  async getDashboardStats() {
    const [totalImages, totalLikes, recentImages] = await Promise.all([
      imageRepo.count(),
      likeRepo.totalLikes(),
      imageRepo.listAll({ limit: 5 }),
    ]);

    // Most liked — simple: get the image with the highest like count
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

    return { totalImages, totalLikes, recentImages, mostLiked };
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
