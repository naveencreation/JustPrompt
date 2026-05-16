import { createAdminClient } from "@/lib/db/client";
import { PAGE_SIZE } from "@/lib/constants/limits";
import { encodeCursor } from "@/lib/utils/cursor";
import type { Cursor, CreateImageInput, Image, ImageId, Sort } from "@/lib/db/schema";

function toSnakeCase(input: CreateImageInput) {
  return {
    slug: input.slug,
    storage_key: input.storageKey,
    storage_provider: input.storageProvider,
    image_url: input.imageUrl,
    width: input.width,
    height: input.height,
    prompt: input.prompt,
    description: input.description,
    model: input.model,
    is_published: input.isPublished,
  };
}

export interface ListPublishedOptions {
  before?: Cursor | null;
  limit?: number;
  sort?: Sort;
  tagSlug?: string;
}

export interface ListResult {
  items: Image[];
  nextCursor: string | null;
}

export const imageRepo = {
  async findById(id: ImageId): Promise<Image | null> {
    const supabase = createAdminClient();
    const { data } = await supabase.from("images").select("*").eq("id", id).single();
    return data as Image | null;
  },

  async findBySlug(slug: string): Promise<Image | null> {
    const supabase = createAdminClient();
    const { data } = await supabase.from("images").select("*").eq("slug", slug).maybeSingle();
    return data as Image | null;
  },

  async listPublished(opts: ListPublishedOptions = {}): Promise<ListResult> {
    const { before = null, limit = PAGE_SIZE, sort = "new", tagSlug } = opts;
    const supabase = createAdminClient();

    let q = supabase
      .from("images")
      .select("*")
      .eq("is_published", true)
      .limit(limit);

    if (before) {
      q = q.or(
        `created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id})`,
      );
    }

    if (tagSlug) {
      // Filter via image_tags join — use a subquery
      const { data: tagData } = await supabase
        .from("tags")
        .select("id")
        .eq("slug", tagSlug)
        .single();
      if (tagData) {
        const { data: imageTagData } = await supabase
          .from("image_tags")
          .select("image_id")
          .eq("tag_id", (tagData as { id: number }).id);
        const ids = (imageTagData ?? []).map((r: { image_id: string }) => r.image_id);
        if (ids.length === 0) return { items: [], nextCursor: null };
        q = q.in("id", ids);
      }
    }

    if (sort === "likes") {
      q = q.order("display_order", { ascending: true });
    } else if (sort === "random") {
      // Deterministic randomness per page load — handled in service layer
      q = q.order("created_at", { ascending: false }).order("id", { ascending: false });
    } else {
      q = q.order("created_at", { ascending: false }).order("id", { ascending: false });
    }

    const { data, error } = await q;
    if (error) throw new Error(`imageRepo.listPublished failed: ${error.message}`);

    const items = (data ?? []) as unknown as Image[];
    const last = items[items.length - 1];
    const nextCursor =
      items.length === limit && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null;

    return { items, nextCursor };
  },

  async listAll(opts: { limit?: number; offset?: number } = {}): Promise<Image[]> {
    const { limit = 50, offset = 0 } = opts;
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("images")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(`imageRepo.listAll failed: ${error.message}`);
    return (data ?? []) as unknown as Image[];
  },

  async create(input: CreateImageInput): Promise<Image> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("images")
      .insert(toSnakeCase(input))
      .select()
      .single();
    if (error || !data) throw new Error(`imageRepo.create failed: ${error?.message}`);
    return data as unknown as Image;
  },

  async update(id: ImageId, input: Partial<CreateImageInput>): Promise<Image> {
    const supabase = createAdminClient();
    const patch: Record<string, unknown> = {};
    if (input.prompt !== undefined) patch["prompt"] = input.prompt;
    if (input.description !== undefined) patch["description"] = input.description;
    if (input.model !== undefined) patch["model"] = input.model;
    if (input.isPublished !== undefined) patch["is_published"] = input.isPublished;
    if (input.imageUrl !== undefined) patch["image_url"] = input.imageUrl;
    if (input.slug !== undefined) patch["slug"] = input.slug;

    const { data, error } = await supabase
      .from("images")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error || !data) throw new Error(`imageRepo.update failed: ${error?.message}`);
    return data as unknown as Image;
  },

  async delete(id: ImageId): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase.from("images").delete().eq("id", id);
    if (error) throw new Error(`imageRepo.delete failed: ${error.message}`);
  },

  async count(): Promise<number> {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("images")
      .select("*", { count: "exact", head: true });
    if (error) throw new Error(`imageRepo.count failed: ${error.message}`);
    return count ?? 0;
  },
};
