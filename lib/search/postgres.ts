import { createAdminClient } from "@/lib/db/client";
import { PAGE_SIZE } from "@/lib/constants/limits";
import { encodeCursor } from "@/lib/utils/cursor";
import type { Cursor, Image } from "@/lib/db/schema";
import { fromRow, type ImageRow } from "@/lib/repos/imageRepo";
import type { Search, SearchResult } from "./index";

export class PostgresSearch implements Search {
  async query(
    q: string,
    opts: { cursor?: Cursor | null; limit?: number } = {},
  ): Promise<SearchResult> {
    const { cursor = null, limit = PAGE_SIZE } = opts;
    const supabase = createAdminClient();

    let queryBuilder = supabase
      .from("images")
      .select("*")
      .eq("is_published", true)
      .textSearch("search_vector", q, { type: "websearch", config: "english" })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (cursor) {
      queryBuilder = queryBuilder.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    }

    const { data, error } = await queryBuilder;

    if (error) throw new Error(`Search query failed: ${error.message}`);

    const rows = (data ?? []) as unknown as ImageRow[];
    const items = rows.map(fromRow);
    const last = items[items.length - 1];
    const nextCursor =
      items.length === limit && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null;

    return { items, nextCursor };
  }
}
