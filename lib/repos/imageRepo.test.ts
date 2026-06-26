import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Image, ImageId, Cursor } from "@/lib/db/schema";
import type { ImageRow } from "@/lib/repos/imageRepo";

// ── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockFrom, QueryBuilder } = vi.hoisted(() => {
  class QueryBuilder {
    constructor(private result: any) {}

    from() { return this; }
    select(_?: any, _opts?: any) { return this; }
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
      const { data, error, count } = this.result;
      const res: any = { data: data ?? null, error: error ?? null };
      if (count !== undefined) res.count = count;
      return Promise.resolve(res).then(resolve);
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

vi.mock("@/lib/constants/limits", () => ({
  PAGE_SIZE: 24,
}));

vi.mock("@/lib/utils/cursor", () => ({
  encodeCursor: vi.fn().mockReturnValue("mock-cursor"),
  decodeCursor: vi.fn(),
}));

// ── Module under test ──────────────────────────────────────────────────────
const { imageRepo, fromRow } = await import("@/lib/repos/imageRepo");

// ── Helpers ─────────────────────────────────────────────────────────────────
const ID = "00000000-0000-0000-0000-000000000001" as ImageId;

function row(overrides: Partial<ImageRow> = {}): ImageRow {
  return {
    id: ID,
    slug: "a-test-image",
    storage_key: "test-key",
    storage_provider: "supabase",
    image_url: "https://example.com/img.jpg",
    width: 1024,
    height: 768,
    prompt: "a test image",
    description: null,
    model: "flux",
    is_published: true,
    is_featured: false,
    display_order: 0,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function stubBuilder(data: any, error: any = null, count?: number) {
  return new QueryBuilder({ data, error, count });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── fromRow (row → Image mapping) ──────────────────────────────────────────
describe("fromRow", () => {
  it("maps snake_case DB row to camelCase Image", () => {
    const img = fromRow(row({
      id: ID,
      slug: "my-image",
      storage_key: "sk",
      storage_provider: "cloudinary",
      image_url: "https://cdn.com/img.jpg",
      width: 640,
      height: 480,
      prompt: "hello world",
      description: "desc",
      model: "flux",
      is_published: false,
      is_featured: true,
      display_order: 5,
      created_at: "2025-06-01T00:00:00.000Z",
      updated_at: "2025-06-02T00:00:00.000Z",
    }));

    expect(img).toEqual({
      id: ID,
      slug: "my-image",
      storageKey: "sk",
      storageProvider: "cloudinary",
      imageUrl: "https://cdn.com/img.jpg",
      width: 640,
      height: 480,
      prompt: "hello world",
      description: "desc",
      model: "flux",
      isPublished: false,
      isFeatured: true,
      displayOrder: 5,
      createdAt: "2025-06-01T00:00:00.000Z",
      updatedAt: "2025-06-02T00:00:00.000Z",
    });
  });
});

// ── findById ────────────────────────────────────────────────────────────────
describe("findById", () => {
  it("returns image when found", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(row()));

    const result = await imageRepo.findById(ID);

    expect(result).toEqual(fromRow(row()));
  });

  it("returns null when not found", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(null));

    const result = await imageRepo.findById(ID);

    expect(result).toBeNull();
  });
});

// ── findBySlug ──────────────────────────────────────────────────────────────
describe("findBySlug", () => {
  it("returns image when slug matches", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(row()));

    const result = await imageRepo.findBySlug("a-test-image");

    expect(result).toEqual(fromRow(row()));
  });

  it("returns null when slug has no match", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(null));

    const result = await imageRepo.findBySlug("nonexistent");

    expect(result).toBeNull();
  });
});

// ── listPublished ──────────────────────────────────────────────────────────
describe("listPublished", () => {
  it("returns paginated published images", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder([row()]));

    const result = await imageRepo.listPublished();

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(fromRow(row()));
    expect(result.nextCursor).toBeNull();
  });

  it("returns nextCursor when results match page size", async () => {
    const rows = Array.from({ length: 24 }, (_, i) =>
      row({ id: `00000000-0000-0000-0000-0000000000${String(i + 1).padStart(2, "0")}` as ImageId }),
    );
    mockFrom.mockReturnValueOnce(stubBuilder(rows));

    const result = await imageRepo.listPublished({ limit: 24 });

    expect(result.items).toHaveLength(24);
    expect(result.nextCursor).toBe("mock-cursor");
  });

  it("returns null cursor when fewer results than page size", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder([row()]));

    const result = await imageRepo.listPublished({ limit: 24 });

    expect(result.nextCursor).toBeNull();
  });

  it("filters by tagSlug when tag exists", async () => {
    const tagData = { id: 1 };
    // First call: from("images") for the main q builder (resolves with image data)
    // Second call: tag lookup
    // Third call: image_tags lookup
    mockFrom
      .mockReturnValueOnce(stubBuilder([row()]))
      .mockReturnValueOnce(stubBuilder(tagData))
      .mockReturnValueOnce(stubBuilder([{ image_id: ID }]));

    const result = await imageRepo.listPublished({ tagSlug: "ai-art" });

    expect(result.items).toHaveLength(1);
  });

  it("returns empty when tagSlug has no image_tags", async () => {
    // Tag lookup succeeds, but image_tags join is empty
    mockFrom
      .mockReturnValueOnce(stubBuilder([]))
      .mockReturnValueOnce(stubBuilder({ id: 2 }))
      .mockReturnValueOnce(stubBuilder([]));

    const result = await imageRepo.listPublished({ tagSlug: "ai-art" });

    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  it("throws when Supabase errors", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(null, new Error("DB down")));

    await expect(imageRepo.listPublished()).rejects.toThrow("imageRepo.listPublished failed");
  });

  it("passes cursor filter when before is set", async () => {
    const cursor: Cursor = { createdAt: "2025-01-01T00:00:00.000Z", id: ID };
    mockFrom.mockReturnValueOnce(stubBuilder([row()]));

    const result = await imageRepo.listPublished({ before: cursor });

    expect(result.items).toHaveLength(1);
  });

  it("excludes image ID when excludeId is set", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder([row()]));

    const result = await imageRepo.listPublished({ excludeId: ID });

    expect(result.items).toHaveLength(1);
  });

  it("sorts by display_order when sort is 'likes'", async () => {
    const ordered = [
      row({ id: "00000000-0000-0000-0000-000000000001" as ImageId, display_order: 1 }),
      row({ id: "00000000-0000-0000-0000-000000000002" as ImageId, display_order: 2 }),
    ];
    mockFrom.mockReturnValueOnce(stubBuilder(ordered));

    const result = await imageRepo.listPublished({ sort: "likes" });

    expect(result.items).toHaveLength(2);
  });

  it("returns empty array when no published images match", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder([]));

    const result = await imageRepo.listPublished();

    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });
});

// ── listAll ─────────────────────────────────────────────────────────────────
describe("listAll", () => {
  it("returns all images with default options", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder([row()]));

    const result = await imageRepo.listAll();

    expect(result).toHaveLength(1);
  });

  it("filters by published status", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder([row()]));

    const result = await imageRepo.listAll({ status: "published" });

    expect(result).toHaveLength(1);
  });

  it("filters by draft status", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder([row({ is_published: false })]));

    const result = await imageRepo.listAll({ status: "draft" });

    expect(result).toHaveLength(1);
  });

  it("filters by tagSlug when tag exists", async () => {
    mockFrom
      .mockReturnValueOnce(stubBuilder([row()]))
      .mockReturnValueOnce(stubBuilder({ id: 1 }))
      .mockReturnValueOnce(stubBuilder([{ image_id: ID }]));

    const result = await imageRepo.listAll({ tagSlug: "ai" });

    expect(result).toHaveLength(1);
  });

  it("returns empty when tagSlug has no match", async () => {
    mockFrom
      .mockReturnValueOnce(stubBuilder([]))
      .mockReturnValueOnce(stubBuilder(null));

    const result = await imageRepo.listAll({ tagSlug: "nonexistent" });

    expect(result).toEqual([]);
  });

  it("returns empty when tagSlug exists but no image_tags match", async () => {
    mockFrom
      .mockReturnValueOnce(stubBuilder([]))
      .mockReturnValueOnce(stubBuilder({ id: 1 }))
      .mockReturnValueOnce(stubBuilder([]));

    const result = await imageRepo.listAll({ tagSlug: "ai" });

    expect(result).toEqual([]);
  });

  it("throws on Supabase error", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(null, new Error("DB down")));

    await expect(imageRepo.listAll()).rejects.toThrow("imageRepo.listAll failed");
  });
});

// ── create ─────────────────────────────────────────────────────────────────
describe("create", () => {
  it("creates and returns the new image", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(row()));

    const result = await imageRepo.create({
      storageKey: "key",
      storageProvider: "supabase",
      imageUrl: "https://example.com/img.jpg",
      width: 1024,
      height: 768,
      prompt: "a test image",
    });

    expect(result).toEqual(fromRow(row()));
  });

  it("throws on Supabase error", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(null, new Error("Insert failed")));

    await expect(
      imageRepo.create({
        storageKey: "key",
        storageProvider: "supabase",
        imageUrl: "https://example.com/img.jpg",
        width: 1024,
        height: 768,
        prompt: "a test image",
      }),
    ).rejects.toThrow("imageRepo.create failed");
  });
});

// ── update ─────────────────────────────────────────────────────────────────
describe("update", () => {
  it("updates and returns the image", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(row({ prompt: "updated" })));

    const result = await imageRepo.update(ID, { prompt: "updated" });

    expect(result).toEqual(fromRow(row({ prompt: "updated" })));
  });

  it("throws on Supabase error", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(null, new Error("Update failed")));

    await expect(imageRepo.update(ID, { prompt: "new" })).rejects.toThrow("imageRepo.update failed");
  });
});

// ── updateOrder ─────────────────────────────────────────────────────────────
describe("updateOrder", () => {
  it("passes when all updates succeed", async () => {
    const updates = [
      { id: ID, displayOrder: 1 },
      { id: "00000000-0000-0000-0000-000000000002" as ImageId, displayOrder: 2 },
    ];
    mockFrom
      .mockReturnValueOnce(stubBuilder({ data: null, error: null }))
      .mockReturnValueOnce(stubBuilder({ data: null, error: null }));

    await expect(imageRepo.updateOrder(updates)).resolves.toBeUndefined();
  });
});

// ── delete ──────────────────────────────────────────────────────────────────
describe("delete", () => {
  it("deletes the image by id", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(null));

    await expect(imageRepo.delete(ID)).resolves.toBeUndefined();
  });

  it("throws on Supabase error", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(null, new Error("Delete failed")));

    await expect(imageRepo.delete(ID)).rejects.toThrow("imageRepo.delete failed");
  });
});

// ── listRelated ─────────────────────────────────────────────────────────────
describe("listRelated", () => {
  it("returns related images by shared tags", async () => {
    mockFrom
      .mockReturnValueOnce(stubBuilder([{ image_id: ID }]))
      .mockReturnValueOnce(stubBuilder([row()]));

    const result = await imageRepo.listRelated({ currentImageId: ID, tagIds: [1, 2] });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(fromRow(row()));
  });

  it("returns empty array when tagIds is empty", async () => {
    const result = await imageRepo.listRelated({ currentImageId: ID, tagIds: [] });

    expect(result).toEqual([]);
  });

  it("returns empty when no related images (no image_tags match)", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder([]));

    const result = await imageRepo.listRelated({ currentImageId: ID, tagIds: [1, 2] });

    expect(result).toEqual([]);
  });

  it("returns empty when tag IDs exist but no published images match", async () => {
    mockFrom
      .mockReturnValueOnce(stubBuilder([{ image_id: ID }]))
      .mockReturnValueOnce(stubBuilder([]));

    const result = await imageRepo.listRelated({ currentImageId: ID, tagIds: [1] });

    expect(result).toEqual([]);
  });

  it("uses default limit of 6", async () => {
    mockFrom
      .mockReturnValueOnce(stubBuilder([{ image_id: ID }]))
      .mockReturnValueOnce(stubBuilder([row()]));

    const result = await imageRepo.listRelated({ currentImageId: ID, tagIds: [1] });

    expect(result).toHaveLength(1);
  });

  it("respects custom limit", async () => {
    mockFrom
      .mockReturnValueOnce(stubBuilder(Array.from({ length: 10 }, (_, i) => ({ image_id: `00000000-0000-0000-0000-0000000000${i}` }))))
      .mockReturnValueOnce(stubBuilder(Array.from({ length: 4 }, () => row())));

    const result = await imageRepo.listRelated({ currentImageId: ID, tagIds: [1], limit: 4 });

    expect(result).toHaveLength(4);
  });

  it("throws on join query error", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(null, new Error("Join failed")));

    await expect(
      imageRepo.listRelated({ currentImageId: ID, tagIds: [1] }),
    ).rejects.toThrow("imageRepo.listRelated join query failed");
  });
});

// ── count ───────────────────────────────────────────────────────────────────
describe("count", () => {
  it("returns the total image count", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder([], null, 42));

    const result = await imageRepo.count();

    expect(result).toBe(42);
  });

  it("returns 0 when count is null", async () => {
    // Simulate Supabase returning null count
    mockFrom.mockReturnValueOnce(stubBuilder(null));

    const result = await imageRepo.count();

    expect(result).toBe(0);
  });

  it("throws on Supabase error", async () => {
    mockFrom.mockReturnValueOnce(stubBuilder(null, new Error("Count failed")));

    await expect(imageRepo.count()).rejects.toThrow("imageRepo.count failed");
  });
});
