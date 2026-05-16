import type { Cursor } from "@/lib/db/schema";
import type { Search, SearchResult } from "./index";

/**
 * Tier 2 upgrade path — Meilisearch.
 *
 * Stub. To activate:
 *   1. `pnpm add meilisearch`
 *   2. Set `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY`.
 *   3. Implement using the Meilisearch JS client.
 *
 * The factory at `lib/search/factory.ts` only loads this module when
 * `config.search === "meili"`.
 */
export class MeilisearchSearch implements Search {
  constructor() {
    throw new Error(
      "MeilisearchSearch is not implemented yet. Install meilisearch and complete the implementation in lib/search/meilisearch.ts before setting MEILISEARCH_HOST.",
    );
  }

  async query(
    _q: string,
    _opts?: { cursor?: Cursor | null; limit?: number },
  ): Promise<SearchResult> {
    throw new Error("MeilisearchSearch.query not implemented");
  }
}
