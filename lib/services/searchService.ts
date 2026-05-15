import { search } from "@/lib/search/factory";
import { decodeCursor } from "@/lib/utils/cursor";
import type { Image } from "@/lib/db/schema";

export interface SearchOptions {
  cursor?: string | null;
  limit?: number;
}

export interface SearchResult {
  items: Image[];
  nextCursor: string | null;
}

export const searchService = {
  async query(q: string, opts: SearchOptions = {}): Promise<SearchResult> {
    const { cursor: cursorStr, limit } = opts;
    const cursor = cursorStr ? decodeCursor(cursorStr) : null;
    return search.query(q, { cursor, limit });
  },
};
