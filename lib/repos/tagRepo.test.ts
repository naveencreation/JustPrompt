import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Tag, ImageId } from "@/lib/db/schema";

// ── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockFrom, QueryBuilder } = vi.hoisted(() => {
  class QueryBuilder {
    constructor(private result: any) {}

    from() { return this; }
    select(_?: any) { return this; }
    eq() { return this; }
    neq() { return this; }
    order() { return this; }
    limit() { return this; }
    or() { return this; }
    in() { return this; }
    single() { return this; }
    maybeSingle() { return this; }
    insert() { return this; }
    update() { return this; }
    delete() { return this; }
    upsert() { return this; }

    then<T>(resolve: (v: any) => T): Promise<T> {
      const { data, error } = this.result;
      return Promise.resolve({ data: data ?? null, error: error ?? null }).then(resolve);
    }
  }

  return {
    mockFrom: vi.fn(),
    QueryBuilder,
  };
});

vi.mock("@/lib/db/client", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/observability/errors", () => ({
  errors: { capture: vi.fn() },
}));

// ── Module under test ──────────────────────────────────────────────────────
const { tagRepo } = await import("@/lib/repos/tagRepo");

// ── Helpers ─────────────────────────────────────────────────────────────────
const IMG_ID = "00000000-0000-0000-0000-000000000001" as ImageId;

function tagRow(overrides: Partial<Tag> = {}): Tag {
  return {
    id: 1,
    name: "ai-art",
    slug: "ai-art",
    ...overrides,
  };
}

function stubBuilder(data: any, error: any = null) {
  return new QueryBuilder({ data, error });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── findOrCreate ──────────────────────────────────────────────────────────
describe("findOrCreate", () => {
  const tag = tagRow();

  it("returns existing tag on first select (no insert needed)", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(tag));

    const result = await tagRepo.findOrCreate("ai-art");

    expect(result).toEqual(tag);
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("creates and returns a new tag on cache-miss", async () => {
    mockFrom
      .mockReturnValueOnce(stubBuilder(null))           // select: no existing
      .mockReturnValueOnce(stubBuilder(tag));            // insert: succeeds

    const result = await tagRepo.findOrCreate("ai-art");

    expect(result).toEqual(tag);
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it("recovers from a 23505 unique-violation conflict", async () => {
    const conflictError = { code: "23505", message: "duplicate key value violates unique constraint" };
    mockFrom
      .mockReturnValueOnce(stubBuilder(null))                // select: no existing
      .mockReturnValueOnce(stubBuilder(null, conflictError))  // insert: 23505
      .mockReturnValueOnce(stubBuilder(tag));                 // fallback select: found

    const result = await tagRepo.findOrCreate("ai-art");

    expect(result).toEqual(tag);
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });

  it("throws when 23505 conflict fallback also returns null", async () => {
    const conflictError = { code: "23505", message: "duplicate key value violates unique constraint" };
    mockFrom
      .mockReturnValueOnce(stubBuilder(null))                // select: no existing
      .mockReturnValueOnce(stubBuilder(null, conflictError))  // insert: 23505
      .mockReturnValueOnce(stubBuilder(null));                // fallback: null (deleted concurrently)

    await expect(tagRepo.findOrCreate("ai-art")).rejects.toThrow("tagRepo.findOrCreate failed");
  });

  it("throws on non-23505 database error", async () => {
    const dbError = { code: "40001", message: "serialization failure" };
    mockFrom
      .mockReturnValueOnce(stubBuilder(null))                // select: no existing
      .mockReturnValueOnce(stubBuilder(null, dbError));       // insert: non-23505 error

    await expect(tagRepo.findOrCreate("ai-art")).rejects.toThrow("tagRepo.findOrCreate failed");
  });

  it("throws on hard network/query failure in insert", async () => {
    mockFrom
      .mockReturnValueOnce(stubBuilder(null))
      .mockReturnValueOnce(stubBuilder(null, new Error("Connection lost")));

    await expect(tagRepo.findOrCreate("ai-art")).rejects.toThrow("tagRepo.findOrCreate failed");
  });
});

// ── attachToImage ─────────────────────────────────────────────────────────
describe("attachToImage", () => {
  it("upserts tag-image rows", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(null));

    await tagRepo.attachToImage(IMG_ID, [1, 2, 3]);

    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when tagIds is empty", async () => {
    await tagRepo.attachToImage(IMG_ID, []);

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("throws on Supabase error", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(null, new Error("Upsert failed")));

    await expect(tagRepo.attachToImage(IMG_ID, [1])).rejects.toThrow("tagRepo.attachToImage failed");
  });
});

// ── detachAllFromImage ────────────────────────────────────────────────────
describe("detachAllFromImage", () => {
  it("deletes all image_tags for the given image", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(null));

    await tagRepo.detachAllFromImage(IMG_ID);

    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("throws on Supabase error", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(null, new Error("Delete failed")));

    await expect(tagRepo.detachAllFromImage(IMG_ID)).rejects.toThrow("tagRepo.detachAllFromImage failed");
  });
});

// ── findBySlug ────────────────────────────────────────────────────────────
describe("findBySlug", () => {
  it("returns tag when found", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(tagRow()));

    const result = await tagRepo.findBySlug("ai-art");

    expect(result).toEqual(tagRow());
  });

  it("returns null when not found", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(null));

    const result = await tagRepo.findBySlug("nonexistent");

    expect(result).toBeNull();
  });
});

// ── listByImage ───────────────────────────────────────────────────────────
describe("listByImage", () => {
  const tagsRow = { tags: { id: 1, name: "ai-art", slug: "ai-art" } };

  it("returns tags for the given image", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder([tagsRow]));

    const result = await tagRepo.listByImage(IMG_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 1, name: "ai-art", slug: "ai-art" });
  });

  it("returns empty array when image has no tags", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder([]));

    const result = await tagRepo.listByImage(IMG_ID);

    expect(result).toEqual([]);
  });

  it("throws on Supabase error", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(null, new Error("Query failed")));

    await expect(tagRepo.listByImage(IMG_ID)).rejects.toThrow("tagRepo.listByImage failed");
  });
});

// ── popular ───────────────────────────────────────────────────────────────
describe("popular", () => {
  const t1 = { id: 1, name: "ai", slug: "ai" };
  const t2 = { id: 2, name: "art", slug: "art" };
  const t3 = { id: 3, name: "photo", slug: "photo" };

  function imageTagRow(tag: typeof t1) {
    return { tag_id: tag.id, tags: tag };
  }

  it("returns tags sorted by frequency descending", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder([
      imageTagRow(t1), imageTagRow(t1), imageTagRow(t1),
      imageTagRow(t2), imageTagRow(t2),
      imageTagRow(t3),
    ]));

    const result = await tagRepo.popular();

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(1);
    expect(result[0].count).toBe(3);
    expect(result[1].id).toBe(2);
    expect(result[1].count).toBe(2);
    expect(result[2].id).toBe(3);
    expect(result[2].count).toBe(1);
  });

  it("respects the limit parameter", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder([
      imageTagRow(t1), imageTagRow(t1), imageTagRow(t1),
      imageTagRow(t2), imageTagRow(t2),
    ]));

    const result = await tagRepo.popular(1);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("returns empty array when no image_tags exist for published images", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder([]));

    const result = await tagRepo.popular();

    expect(result).toEqual([]);
  });

  it("throws on Supabase error", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(null, new Error("DB down")));

    await expect(tagRepo.popular()).rejects.toThrow("tagRepo.popular failed");
  });
});
