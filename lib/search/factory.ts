import { config } from "@/lib/config";
import { PostgresSearch } from "./postgres";
import type { Search } from "./index";

function createSearch(): Search {
  if (config.search === "meili") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MeilisearchSearch } = require("./meilisearch") as { MeilisearchSearch: new () => Search };
    return new MeilisearchSearch();
  }
  return new PostgresSearch();
}

export const search: Search = createSearch();
