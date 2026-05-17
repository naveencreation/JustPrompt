import { createAdminClient } from "@/lib/db/client";

// ─── searchLogRepo ──────────────────────────────────────────────────────────
// Append-only log of every search query fired against /api/search.
// Aggregation queries power the "Search Intelligence" dashboard section.

export type TopQueryRow = { query: string; count: number };

export const searchLogRepo = {
  /** Fire-and-forget insert — called from searchService after every query. */
  async logSearch(query: string, resultsCount: number): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("search_logs")
      .insert({ query: query.trim().toLowerCase(), results_count: resultsCount });
    if (error) throw new Error(`searchLogRepo.logSearch failed: ${error.message}`);
  },

  /**
   * Top N most-searched queries (all, regardless of results count).
   * Aggregated with COUNT(*) GROUP BY query.
   */
  async getTopQueries(limit = 10): Promise<TopQueryRow[]> {
    const supabase = createAdminClient();
    // Supabase doesn't expose GROUP BY natively, so we use an RPC or raw SQL.
    // We use a workaround: fetch recent logs and aggregate in JS for Tier 0.
    // For Tier 1+, a Postgres view would be more efficient.
    const { data } = await supabase
      .from("search_logs")
      .select("query")
      .order("created_at", { ascending: false })
      .limit(500); // Sample from recent 500 entries

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const q = (row as { query: string }).query;
      counts[q] = (counts[q] ?? 0) + 1;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query, count]) => ({ query, count }));
  },

  /**
   * Top N most-searched queries that returned 0 results.
   * These are the highest-priority content gaps to fill.
   */
  async getZeroResultQueries(limit = 10): Promise<TopQueryRow[]> {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("search_logs")
      .select("query")
      .eq("results_count", 0)
      .order("created_at", { ascending: false })
      .limit(500);

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const q = (row as { query: string }).query;
      counts[q] = (counts[q] ?? 0) + 1;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query, count]) => ({ query, count }));
  },
};
