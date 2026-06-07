import { createAdminClient } from "@/lib/db/client";
import type { ImageId, Settings } from "@/lib/db/schema";

type SettingsRow = {
  id: number;
  featured_image_id: string | null;
  maintenance_mode: boolean;
  updated_at: string;
};

function fromSettingsRow(row: SettingsRow): Settings {
  return {
    id: 1,
    featuredImageId: (row.featured_image_id as ImageId) ?? null,
    maintenanceMode: row.maintenance_mode,
    updatedAt: row.updated_at,
  };
}

export const settingsRepo = {
  async getSettings(): Promise<Settings | null> {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single();
    return data ? fromSettingsRow(data as SettingsRow) : null;
  },

  async setFeaturedImage(imageId: ImageId | null): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("settings")
      .update({ featured_image_id: imageId })
      .eq("id", 1);
    if (error) throw new Error(`settingsRepo.setFeaturedImage failed: ${error.message}`);
  },

  async setMaintenanceMode(enabled: boolean): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("settings")
      .update({ maintenance_mode: enabled })
      .eq("id", 1);
    if (error) throw new Error(`settingsRepo.setMaintenanceMode failed: ${error.message}`);
  },

  /** Returns the image_id with the highest persisted like count, or null if no rows. */
  async getMostLikedImageId(): Promise<ImageId | null> {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("like_counts")
      .select("image_id, count")
      .order("count", { ascending: false })
      .limit(1);
    return (data?.[0] as { image_id: ImageId } | undefined)?.image_id ?? null;
  },
};
