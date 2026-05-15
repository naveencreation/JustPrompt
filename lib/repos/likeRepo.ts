import { createAdminClient } from "@/lib/db/client";
import type { ImageId } from "@/lib/db/schema";

export const likeRepo = {
  async getCount(imageId: ImageId): Promise<number> {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("like_counts")
      .select("count")
      .eq("image_id", imageId)
      .maybeSingle();
    return (data as { count: number } | null)?.count ?? 0;
  },

  async upsertCount(imageId: ImageId, count: number): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("like_counts")
      .upsert({ image_id: imageId, count }, { onConflict: "image_id" });
    if (error) throw new Error(`likeRepo.upsertCount failed: ${error.message}`);
  },

  async incrementBy(imageId: ImageId, delta: number): Promise<void> {
    const supabase = createAdminClient();
    // Upsert: insert 0 first to ensure row exists, then increment
    await supabase
      .from("like_counts")
      .upsert({ image_id: imageId, count: 0 }, { onConflict: "image_id", ignoreDuplicates: true });

    const { error } = await supabase.rpc("increment_like_count", {
      p_image_id: imageId,
      p_delta: delta,
    });

    // Fallback: RPC may not exist yet — do a read-then-write
    if (error) {
      const current = await this.getCount(imageId);
      await this.upsertCount(imageId, current + delta);
    }
  },

  async totalLikes(): Promise<number> {
    const supabase = createAdminClient();
    const { data } = await supabase.from("like_counts").select("count");
    return (data ?? []).reduce((sum, row) => sum + ((row as { count: number }).count ?? 0), 0);
  },
};
