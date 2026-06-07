import { search } from "@/lib/search/factory";
import { decodeCursor } from "@/lib/utils/cursor";
import { searchLogRepo } from "@/lib/repos/searchLogRepo";
import { errors } from "@/lib/observability/errors";
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
    const searchResponse = await search.query(q, { cursor, limit });

    // Fire-and-forget: log the search query + results count for dashboard analytics.
    // Intentionally not awaited — search latency must not be affected by logging.
    searchLogRepo.logSearch(q, searchResponse.items.length).catch((err) => {
      errors.capture(err, { op: "search.log_failed", query: q });
    });

    return searchResponse;
  },
};
