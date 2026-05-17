import { createAdminClient } from "@/lib/db/client";
import type { ImageId } from "@/lib/db/schema";

// ─── metricRepo ─────────────────────────────────────────────────────────────
// Raw DB access for copy_counts and view_counts.
// Mirrors likeRepo.ts exactly — same upsert + RPC increment pattern.

export const metricRepo = {
  // ── Copy counts ────────────────────────────────────────────────────────────

  async getCopyCount(imageId: ImageId): Promise<number> {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("copy_counts")
      .select("count")
      .eq("image_id", imageId)
      .maybeSingle();
    return (data as { count: number } | null)?.count ?? 0;
  },

  async upsertCopyCount(imageId: ImageId, count: number): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("copy_counts")
      .upsert({ image_id: imageId, count }, { onConflict: "image_id" });
    if (error) throw new Error(`metricRepo.upsertCopyCount failed: ${error.message}`);
  },

  async incrementCopyBy(imageId: ImageId, delta: number): Promise<void> {
    const supabase = createAdminClient();
    // Ensure row exists before calling RPC
    await supabase
      .from("copy_counts")
      .upsert({ image_id: imageId, count: 0 }, { onConflict: "image_id", ignoreDuplicates: true });

    const { error } = await supabase.rpc("increment_copy_count", {
      p_image_id: imageId,
      p_delta: delta,
    });

    // Fallback: RPC may not exist yet — do a read-then-write
    if (error) {
      const current = await this.getCopyCount(imageId);
      await this.upsertCopyCount(imageId, current + delta);
    }
  },

  async totalCopies(): Promise<number> {
    const supabase = createAdminClient();
    const { data } = await supabase.from("copy_counts").select("count");
    return (data ?? []).reduce(
      (sum, row) => sum + ((row as { count: number }).count ?? 0),
      0,
    );
  },

  // ── View counts ────────────────────────────────────────────────────────────

  async getViewCount(imageId: ImageId): Promise<number> {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("view_counts")
      .select("count")
      .eq("image_id", imageId)
      .maybeSingle();
    return (data as { count: number } | null)?.count ?? 0;
  },

  async incrementViewBy(imageId: ImageId, delta: number): Promise<void> {
    const supabase = createAdminClient();
    // Ensure row exists
    await supabase
      .from("view_counts")
      .upsert({ image_id: imageId, count: 0 }, { onConflict: "image_id", ignoreDuplicates: true });

    const { error } = await supabase.rpc("increment_view_count", {
      p_image_id: imageId,
      p_delta: delta,
    });

    // Fallback if RPC not available
    if (error) {
      const current = await this.getViewCount(imageId);
      const supabase2 = createAdminClient();
      await supabase2
        .from("view_counts")
        .upsert({ image_id: imageId, count: current + delta }, { onConflict: "image_id" });
    }
  },

  async totalViews(): Promise<number> {
    const supabase = createAdminClient();
    const { data } = await supabase.from("view_counts").select("count");
    return (data ?? []).reduce(
      (sum, row) => sum + ((row as { count: number }).count ?? 0),
      0,
    );
  },

  // ── Top content queries (for dashboard) ────────────────────────────────────

  /** Returns top N image IDs ordered by copy count descending. */
  async topCopied(limit = 10): Promise<{ imageId: ImageId; count: number }[]> {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("copy_counts")
      .select("image_id, count")
      .order("count", { ascending: false })
      .limit(limit);
    return (data ?? []).map((r) => ({
      imageId: (r as { image_id: ImageId; count: number }).image_id,
      count: (r as { image_id: ImageId; count: number }).count,
    }));
  },
};
