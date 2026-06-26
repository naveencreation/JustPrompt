import { config } from "@/lib/config";
import type { Image } from "@/lib/db/schema";

/**
 * Search index synchronization interface.
 * Implements the strategy pattern for syncing data to search backends.
 *
 * Tier 0: No-op (Postgres FTS doesn't need explicit indexing)
 * Tier 2: Meilisearch indexing
 */
export interface SearchIndexSync {
  /** Add or update a document in the search index */
  index(image: Image): Promise<void>;
  /** Remove a document from the search index */
  remove(imageId: string): Promise<void>;
}

export class NoOpSearchSync implements SearchIndexSync {
  async index(): Promise<void> {
    // Postgres FTS is updated automatically via triggers
  }

  async remove(): Promise<void> {
    // Postgres FTS is updated automatically via triggers
  }
}

/**
 * Meilisearch index synchronizer.
 * Ensures Meilisearch stays in sync with Postgres.
 */
export class MeilisearchSync implements SearchIndexSync {
  private readonly host: string;
  private readonly apiKey: string;
  private readonly indexName = "images";

  constructor() {
    const { host, apiKey } = config.meili;
    if (!host || !apiKey) {
      throw new Error("MeilisearchSync requires MEILISEARCH_HOST and MEILISEARCH_API_KEY to be set.");
    }
    this.host = host;
    this.apiKey = apiKey;
  }

  async index(image: Image): Promise<void> {
    const doc = {
      id: image.id,
      slug: image.slug,
      prompt: image.prompt,
      description: image.description,
      model: image.model,
      createdAt: image.createdAt,
    };

    await fetch(`${this.host}/indexes/${this.indexName}/documents`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([doc]),
      cache: "no-store",
    });
  }

  async remove(imageId: string): Promise<void> {
    await fetch(`${this.host}/indexes/${this.indexName}/documents/${imageId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      cache: "no-store",
    });
  }
}

function createSearchSync(): SearchIndexSync {
  if (config.search === "meili") {
    return new MeilisearchSync();
  }
  return new NoOpSearchSync();
}

export const searchSync: SearchIndexSync = createSearchSync();
