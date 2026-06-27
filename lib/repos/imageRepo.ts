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

// PostgREST returns rows with snake_case column names. Map them to the
// camelCase shape declared in `lib/db/schema.ts` so consumers can use
// `image.imageUrl` etc. without runtime surprises.
export type ImageRow = {
  id: string;
  slug: string;
  storage_key: string;
  storage_provider: "supabase" | "cloudinary";
  image_url: string;
  width: number;
  height: number;
  prompt: string;
  description: string | null;
  model: Image["model"];
  is_published: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export function fromRow(row: ImageRow): Image {
  return {
    id: row.id as Image["id"],
    slug: row.slug,
    storageKey: row.storage_key,
    storageProvider: row.storage_provider,
    imageUrl: row.image_url,
    width: row.width,
    height: row.height,
    prompt: row.prompt,
    description: row.description,
    model: row.model,
    isPublished: row.is_published,
    isFeatured: row.is_featured,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromRowOrNull(row: ImageRow | null): Image | null {
  return row ? fromRow(row) : null;
}

export interface ListPublishedOptions {
  before?: Cursor | null;
  limit?: number;
  sort?: Sort;
  tagSlug?: string;
  excludeId?: ImageId;
}

export interface ListResult {
  items: Image[];
  nextCursor: string | null;
}

export const imageRepo = {
  async findById(id: ImageId): Promise<Image | null> {
    const supabase = createAdminClient();
    const { data } = await supabase.from("images").select("*").eq("id", id).single();
    return fromRowOrNull(data as ImageRow | null);
  },

  async findBySlug(slug: string): Promise<Image | null> {
    const supabase = createAdminClient();
    const { data } = await supabase.from("images").select("*").eq("slug", slug).maybeSingle();
    return fromRowOrNull(data as ImageRow | null);
  },

  async listPublished(opts: ListPublishedOptions = {}): Promise<ListResult> {
    const { before = null, limit = PAGE_SIZE, sort = "new", tagSlug, excludeId } = opts;
    const supabase = createAdminClient();

    let q = supabase
      .from("images")
      .select("*")
      .eq("is_published", true)
      .limit(limit);

    if (excludeId) {
      q = q.neq("id", excludeId);
    }

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
    } else {
      q = q.order("created_at", { ascending: false }).order("id", { ascending: false });
    }

    const { data, error } = await q;
    if (error) throw new Error(`imageRepo.listPublished failed: ${error.message}`);

    let items = ((data ?? []) as ImageRow[]).map(fromRow);

    // Shuffle only the first page of random results (cursor pagination is inherently deterministic)
    if (sort === "random" && !before) {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const a = items[i]!;
        const b = items[j]!;
        items[i] = b;
        items[j] = a;
      }
    }

    const last = items[items.length - 1];
    const nextCursor =
      items.length === limit && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null;

    return { items, nextCursor };
  },

  async listAll(opts: { limit?: number; status?: "published" | "draft"; tagSlug?: string } = {}): Promise<Image[]> {
    const { limit = 50, status, tagSlug } = opts;
    const supabase = createAdminClient();
    
    let q = supabase
      .from("images")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (status === "published") q = q.eq("is_published", true);
    if (status === "draft") q = q.eq("is_published", false);

    if (tagSlug) {
      const { data: tagData } = await supabase.from("tags").select("id").eq("slug", tagSlug).single();
      if (tagData) {
        const { data: imageTagData } = await supabase
          .from("image_tags")
          .select("image_id")
          .eq("tag_id", (tagData as { id: number }).id);
        const ids = (imageTagData ?? []).map((r: { image_id: string }) => r.image_id);
        if (ids.length === 0) return [];
        q = q.in("id", ids);
      } else {
        return [];
      }
    }

    const { data, error } = await q.limit(limit);
    if (error) throw new Error(`imageRepo.listAll failed: ${error.message}`);
    return ((data ?? []) as ImageRow[]).map(fromRow);
  },

  async listAllPaginated(
    opts: { page?: number; pageSize?: number; status?: "published" | "draft"; tagSlug?: string } = {},
  ): Promise<{ items: Image[]; total: number }> {
    const { page = 1, pageSize = 50, status, tagSlug } = opts;
    const supabase = createAdminClient();

    let countQ = supabase
      .from("images")
      .select("*", { count: "exact", head: true });

    let dataQ = supabase
      .from("images")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (status === "published") {
      countQ = countQ.eq("is_published", true);
      dataQ = dataQ.eq("is_published", true);
    }
    if (status === "draft") {
      countQ = countQ.eq("is_published", false);
      dataQ = dataQ.eq("is_published", false);
    }

    if (tagSlug) {
      const { data: tagData } = await supabase.from("tags").select("id").eq("slug", tagSlug).single();
      if (tagData) {
        const { data: imageTagData } = await supabase
          .from("image_tags")
          .select("image_id")
          .eq("tag_id", (tagData as { id: number }).id);
        const ids = (imageTagData ?? []).map((r: { image_id: string }) => r.image_id);
        if (ids.length === 0) return { items: [], total: 0 };
        countQ = countQ.in("id", ids);
        dataQ = dataQ.in("id", ids);
      } else {
        return { items: [], total: 0 };
      }
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const [countResult, dataResult] = await Promise.all([
      countQ,
      dataQ.range(start, end),
    ]);

    if (dataResult.error) throw new Error(`imageRepo.listAllPaginated failed: ${dataResult.error.message}`);

    return {
      items: ((dataResult.data ?? []) as ImageRow[]).map(fromRow),
      total: countResult.count ?? 0,
    };
  },

  async create(input: CreateImageInput): Promise<Image> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("images")
      .insert(toSnakeCase(input))
      .select()
      .single();
    if (error || !data) throw new Error(`imageRepo.create failed: ${error?.message}`);
    return fromRow(data as ImageRow);
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
    return fromRow(data as ImageRow);
  },

  async updateOrder(updates: { id: ImageId; displayOrder: number }[]): Promise<void> {
    const supabase = createAdminClient();
    const results = await Promise.allSettled(
      updates.map((u) =>
        supabase.from("images").update({ display_order: u.displayOrder }).eq("id", u.id)
      )
    );

    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      const first = failures[0] as PromiseRejectedResult;
      throw new Error(`imageRepo.updateOrder partially failed: ${failures.length}/${updates.length} updates failed — ${first.reason}`);
    }
  },

  async delete(id: ImageId): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase.from("images").delete().eq("id", id);
    if (error) throw new Error(`imageRepo.delete failed: ${error.message}`);
  },

  async listRelated(opts: { currentImageId: ImageId; tagIds: number[]; limit?: number }): Promise<Image[]> {
    const { currentImageId, tagIds, limit = 6 } = opts;
    if (tagIds.length === 0) return [];

    const supabase = createAdminClient();
    const { data: imageTagData, error: joinError } = await supabase
      .from("image_tags")
      .select("image_id")
      .in("tag_id", tagIds)
      .neq("image_id", currentImageId);

    if (joinError) throw new Error(`imageRepo.listRelated join query failed: ${joinError.message}`);

    const ids = Array.from(new Set((imageTagData ?? []).map((r: { image_id: string }) => r.image_id)));
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from("images")
      .select("*")
      .in("id", ids)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`imageRepo.listRelated failed: ${error.message}`);
    return ((data ?? []) as ImageRow[]).map(fromRow);
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
