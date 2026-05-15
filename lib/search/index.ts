import type { Image } from "@/lib/db/schema";
import type { Cursor } from "@/lib/db/schema";

export interface SearchResult {
  items: Image[];
  nextCursor: string | null;
}

export interface Search {
  query(q: string, opts?: { cursor?: Cursor | null; limit?: number }): Promise<SearchResult>;
}

export { search } from "./factory";
