import { createAdminClient } from "@/lib/db/client";
import { slugify } from "@/lib/utils/slug";
import type { ImageId, Tag } from "@/lib/db/schema";

export const tagRepo = {
  async findOrCreate(name: string): Promise<Tag> {
    const supabase = createAdminClient();
    const slug = slugify(name);

    const { data: existing } = await supabase
      .from("tags")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) return existing as unknown as Tag;

    const { data, error } = await supabase
      .from("tags")
      .insert({ name, slug })
      .select()
      .single();

    if (error || !data) throw new Error(`tagRepo.findOrCreate failed: ${error?.message}`);
    return data as unknown as Tag;
  },

  async attachToImage(imageId: ImageId, tagIds: number[]): Promise<void> {
    if (tagIds.length === 0) return;
    const supabase = createAdminClient();
    const rows = tagIds.map((tagId) => ({ image_id: imageId, tag_id: tagId }));
    const { error } = await supabase.from("image_tags").upsert(rows, { onConflict: "image_id,tag_id" });
    if (error) throw new Error(`tagRepo.attachToImage failed: ${error.message}`);
  },

  async detachAllFromImage(imageId: ImageId): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase.from("image_tags").delete().eq("image_id", imageId);
    if (error) throw new Error(`tagRepo.detachAllFromImage failed: ${error.message}`);
  },

  async listByImage(imageId: ImageId): Promise<Tag[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("image_tags")
      .select("tags(*)")
      .eq("image_id", imageId);
    if (error) throw new Error(`tagRepo.listByImage failed: ${error.message}`);
    return (data ?? []).flatMap((r) => (r as { tags: unknown }).tags) as unknown as Tag[];
  },

  async popular(limit = 20): Promise<Array<Tag & { count: number }>> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("image_tags")
      .select("tag_id, tags(id, name, slug)")
      .limit(500);
    if (error) throw new Error(`tagRepo.popular failed: ${error.message}`);

    const counts = new Map<number, { tag: Tag; count: number }>();
    for (const row of data ?? []) {
      const r = row as { tag_id: number; tags: unknown };
      const existing = counts.get(r.tag_id);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(r.tag_id, { tag: r.tags as unknown as Tag, count: 1 });
      }
    }

    return [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(({ tag, count }) => ({ ...tag, count }));
  },
};
