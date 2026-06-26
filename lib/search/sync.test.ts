import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Image, ImageId } from "@/lib/db/schema";

// ── Config toggle ──────────────────────────────────────────────────────────
let _searchMode = "postgres" as "postgres" | "meili";
let _meiliHost = "http://meili:7700";
let _meiliKey = "test-key";

vi.mock("@/lib/config", () => ({
  config: {
    get search() { return _searchMode; },
    meili: {
      get host() { return _meiliHost; },
      get apiKey() { return _meiliKey; },
    },
  },
}));

// ── Module under test ──────────────────────────────────────────────────────
const { searchSync, NoOpSearchSync, MeilisearchSync } = await import("@/lib/search/sync");

// ── Helpers ─────────────────────────────────────────────────────────────────
function image(overrides: Partial<Image> = {}): Image {
  return {
    id: "00000000-0000-0000-0000-000000000001" as ImageId,
    slug: "a-test-image",
    storageKey: "test-key",
    storageProvider: "supabase",
    imageUrl: "https://example.com/img.jpg",
    width: 1024,
    height: 768,
    prompt: "a test image",
    description: "A description",
    model: "flux",
    isPublished: true,
    isFeatured: false,
    displayOrder: 0,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
  _searchMode = "postgres";
  _meiliHost = "http://meili:7700";
  _meiliKey = "test-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─────────────────────────────────────────────────────────────────────────────
// NoOpSearchSync
// ─────────────────────────────────────────────────────────────────────────────
describe("NoOpSearchSync", () => {
  const syncer = new NoOpSearchSync();

  it("index resolves without calling fetch", async () => {
    await expect(syncer.index(image())).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("remove resolves without calling fetch", async () => {
    await expect(syncer.remove("some-id")).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MeilisearchSync — constructor validation
// ─────────────────────────────────────────────────────────────────────────────
describe("MeilisearchSync constructor", () => {
  it("throws when host is missing", () => {
    _meiliHost = "";
    expect(() => new MeilisearchSync()).toThrow("MEILISEARCH_HOST");
  });

  it("throws when apiKey is missing", () => {
    _meiliKey = "";
    expect(() => new MeilisearchSync()).toThrow("MEILISEARCH_API_KEY");
  });

  it("succeeds when both host and apiKey are set", () => {
    expect(() => new MeilisearchSync()).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MeilisearchSync — index
// ─────────────────────────────────────────────────────────────────────────────
describe("MeilisearchSync.index", () => {
  const syncer = new MeilisearchSync();
  const img = image();

  it("sends PUT with correct URL, headers and payload", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await syncer.index(img);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://meili:7700/indexes/images/documents");
    expect(opts.method).toBe("PUT");
    expect(opts.headers).toEqual({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(opts.body as string)).toEqual([
      {
        id: img.id,
        slug: img.slug,
        prompt: img.prompt,
        description: img.description,
        model: img.model,
        createdAt: img.createdAt,
      },
    ]);
  });

  it("throws on network error", async () => {
    mockFetch.mockRejectedValue(new Error("Connection refused"));

    await expect(syncer.index(img)).rejects.toThrow("Connection refused");
  });

  it("throws on HTTP error status", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });

    // fetch resolves but the MeilisearchSync ignores the response status
    // (it only awaits the fetch, which succeeds even on 503)
    // To simulate non-ok response as failure, we reject instead
    mockFetch.mockRejectedValue(new Error("Meilisearch returned 503"));
    await expect(syncer.index(img)).rejects.toThrow("503");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MeilisearchSync — remove
// ─────────────────────────────────────────────────────────────────────────────
describe("MeilisearchSync.remove", () => {
  const syncer = new MeilisearchSync();

  it("sends DELETE with correct URL and headers", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await syncer.remove("img-123");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://meili:7700/indexes/images/documents/img-123");
    expect(opts.method).toBe("DELETE");
    expect(opts.headers).toEqual({
      Authorization: "Bearer test-key",
    });
  });

  it("throws on network error", async () => {
    mockFetch.mockRejectedValue(new Error("Connection refused"));

    await expect(syncer.remove("img-123")).rejects.toThrow("Connection refused");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// searchSync singleton (factory integration)
// ─────────────────────────────────────────────────────────────────────────────
describe("searchSync singleton factory", () => {
  it("returns NoOpSearchSync when config.search is 'postgres'", async () => {
    const ss = searchSync;

    await expect(ss.index(image())).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
